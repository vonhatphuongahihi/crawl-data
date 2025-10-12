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
        """Get visit history for a page.
        
        Args:
            page_id: The ID of the page.
            
        Returns:
            Dict containing visit history or None if failed.
            
        Raises:
            MCPAtlassianAuthenticationError: If authentication fails.
            Exception: For other errors.
        """
        try:
            # Call API like api.ts line 70-78
            response = self.confluence.get(
                f"/rest/viewtracker/1.0/report/contents/{page_id}/visitors",
                params={
                    "limit": 1000,
                    "startDate": "2021-01-01",
                    "endDate": "2026-01-01"
                }
            )
            logger.info(f"Successfully retrieved visit history for page {page_id}")
            return response
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
