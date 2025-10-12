"""Confluence page views and visit history operations mixin."""

import logging
from typing import Any, Dict, Optional

from requests import HTTPError

from mcp_atlassian.confluence.client import ConfluenceClient
from mcp_atlassian.exceptions import MCPAtlassianAuthenticationError

logger = logging.getLogger(__name__)


class ViewsMixin(ConfluenceClient):
    """Mixin for Confluence page views and visit history operations."""

    def get_page_total_views(self, page_id: str) -> Optional[int]:
        """Get total view count for a page.
        
        Args:
            page_id: The ID of the page.
            
        Returns:
            Total view count or None if failed.
            
        Raises:
            MCPAtlassianAuthenticationError: If authentication fails.
            Exception: For other errors.
        """
        try:
            # Call API like api.ts line 38-46
            response = self.confluence.get(f"/rest/viewtracker/1.0/visits/contents/{page_id}/total")
            if response and 'count' in response:
                logger.info(f"Successfully retrieved total views for page {page_id}: {response['count']}")
                return int(response['count'])
            logger.warning(f"Total views not found or unexpected response for page {page_id}: {response}")
            return None
        except HTTPError as e:
            if e.response.status_code in (401, 403):
                raise MCPAtlassianAuthenticationError(
                    f"Authentication failed for Confluence API: {e.response.status_code}"
                ) from e
            logger.error(f"Error retrieving total views for {page_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"An unexpected error occurred while retrieving total views for {page_id}: {e}")
            raise

    def get_page_visit_history(self, page_id: str) -> Optional[Dict[str, Any]]:
        """Get visit history for a page grouped by username like api.ts.
        
        Args:
            page_id: The ID of the page.
            
        Returns:
            Dict grouped by username containing visit history or None if failed.
            
        Raises:
            MCPAtlassianAuthenticationError: If authentication fails.
            Exception: For other errors.
        """
        try:
            # First get visitors summary (like getWikiViewHistory in api.ts)
            visitors_response = self.confluence.get(
                f"/rest/viewtracker/1.0/report/contents/{page_id}/visitors",
                params={
                    "limit": 1000,
                    "startDate": "2021-01-01",
                    "endDate": "2026-01-01"
                }
            )
            
            if not visitors_response or not visitors_response.get("results"):
                logger.info(f"No visit history found for page {page_id}")
                return None
            
            # Get detailed visit data for each user (like getVisitHistoryByUserName in api.ts)
            visit_history_by_user = {}
            
            for visitor in visitors_response.get("results", []):
                username = visitor.get("username") or visitor.get("userKey")
                if not username:
                    continue
                    
                try:
                    # Get detailed visit history for this user
                    user_visits_response = self.confluence.get(
                        f"/rest/viewtracker/1.0/visits/contents/{page_id}",
                        params={
                            "startDate": "2021-01-01",
                            "endDate": "2026-01-01",
                            "username": username
                        }
                    )
                    
                    # Process CSV response like in api.ts
                    if user_visits_response and isinstance(user_visits_response, str):
                        # Parse CSV data
                        import csv
                        import io
                        
                        csv_reader = csv.DictReader(io.StringIO(user_visits_response))
                        visits = []
                        
                        for row in csv_reader:
                            visit_record = {
                                "visitDate": row.get("visitDate", ""),
                                "unixDate": row.get("unixDate", ""),
                                "visitId": row.get("visitId", ""),
                                "username": username
                            }
                            visits.append(visit_record)
                        
                        visit_history_by_user[username] = visits
                        
                except Exception as user_visit_error:
                    logger.warning(f"Could not get detailed visits for user {username}: {user_visit_error}")
                    # Fallback: create basic visit record from visitor summary
                    visit_history_by_user[username] = [{
                        "visitDate": visitor.get("lastViewDateFormatted", ""),
                        "unixDate": str(int(visitor.get("lastViewDateFormatted", "").replace("-", "").replace(":", "").replace(" ", "")) if visitor.get("lastViewDateFormatted") else ""),
                        "visitId": f"{page_id}_{username}_{visitor.get('views', 1)}",
                        "username": username
                    }]
            
            logger.info(f"Successfully retrieved visit history for {len(visit_history_by_user)} users for page {page_id}")
            return visit_history_by_user
            
        except HTTPError as e:
            if e.response.status_code in (401, 403):
                raise MCPAtlassianAuthenticationError(
                    f"Authentication failed for Confluence API: {e.response.status_code}"
                ) from e
            logger.error(f"Error retrieving visit history for {page_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"An unexpected error occurred while retrieving visit history for {page_id}: {e}")
            raise
