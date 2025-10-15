"""Module for Confluence page version operations."""

import logging
from typing import Any, Dict, List, Optional

from requests.exceptions import HTTPError

from ..exceptions import MCPAtlassianAuthenticationError
from .client import ConfluenceClient

logger = logging.getLogger("mcp-atlassian")


class VersionsMixin(ConfluenceClient):
    """Mixin for Confluence page version operations."""

    def get_page_versions(
        self, page_id: str, start: int = 0, limit: int = 25
    ) -> Optional[Dict[str, Any]]:
        """
        Get all versions of a specific page.

        Args:
            page_id: The ID of the page to get versions for
            start: The starting index for pagination
            limit: Maximum number of versions to return

        Returns:
            Dictionary containing version history information or None if failed

        Raises:
            MCPAtlassianAuthenticationError: If authentication fails
            Exception: For other errors
        """
        try:
            # Use the Confluence REST API to get page versions
            response = self.confluence.get(
                f"/rest/api/content/{page_id}/version",
                params={
                    "start": start,
                    "limit": limit,
                    "expand": "by"
                }
            )

            if response:
                # Transform the response to include userKey in each version's by field
                results = response.get('results', [])
                for version in results:
                    if version.get('by'):
                        by_info = version['by']
                        # Extract userKey from accountId or other fields if available
                        user_key = by_info.get('userKey') or by_info.get('accountId')
                        if user_key:
                            by_info['userKey'] = user_key
                
                logger.info(f"Successfully retrieved {len(results)} versions for page {page_id}")
                return response
            else:
                logger.warning(f"No versions found for page {page_id}")
                return None

        except HTTPError as e:
            if e.response.status_code in (401, 403):
                raise MCPAtlassianAuthenticationError(
                    f"Authentication failed for Confluence API: {e.response.status_code}"
                ) from e
            logger.error(f"Error retrieving page versions for {page_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"An unexpected error occurred while retrieving page versions for {page_id}: {e}")
            raise

    def get_page_version_details(
        self, page_id: str, version_number: int
    ) -> Optional[Dict[str, Any]]:
        """
        Get details of a specific version of a page.

        Args:
            page_id: The ID of the page
            version_number: The version number to retrieve

        Returns:
            Dictionary containing version details or None if failed

        Raises:
            MCPAtlassianAuthenticationError: If authentication fails
            Exception: For other errors
        """
        try:
            # Use the Confluence REST API to get specific version
            response = self.confluence.get(
                f"/rest/api/content/{page_id}/version/{version_number}",
                params={
                    "expand": "by,content"
                }
            )

            if response:
                # Transform the response to include userKey in the by field
                if response.get('by'):
                    by_info = response['by']
                    # Extract userKey from accountId or other fields if available
                    user_key = by_info.get('userKey') or by_info.get('accountId')
                    if user_key:
                        by_info['userKey'] = user_key
                
                logger.info(f"Successfully retrieved version {version_number} for page {page_id}")
                return response
            else:
                logger.warning(f"Version {version_number} not found for page {page_id}")
                return None

        except HTTPError as e:
            if e.response.status_code in (401, 403):
                raise MCPAtlassianAuthenticationError(
                    f"Authentication failed for Confluence API: {e.response.status_code}"
                ) from e
            logger.error(f"Error retrieving version {version_number} for page {page_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"An unexpected error occurred while retrieving version {version_number} for page {page_id}: {e}")
            raise
