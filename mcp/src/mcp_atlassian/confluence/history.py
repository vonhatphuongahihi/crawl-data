"""Confluence page history operations mixin."""

import logging
from typing import Any, Dict, Optional

from requests import HTTPError

from mcp_atlassian.confluence.client import ConfluenceClient
from mcp_atlassian.exceptions import MCPAtlassianAuthenticationError

logger = logging.getLogger(__name__)


class HistoryMixin(ConfluenceClient):
    """Mixin for Confluence page history operations."""

    def get_page_versions(self, page_id: str) -> Optional[Dict[str, Any]]:
        """Get all versions of a page.
        
        Args:
            page_id: The ID of the page.
            
        Returns:
            Dict containing version information or None if failed.
            
        Raises:
            MCPAtlassianAuthenticationError: If authentication fails.
            Exception: For other errors.
        """
        try:
            # Call API like api.ts line 58-68
            history_data = self.confluence.get_content_history(content_id=page_id)
            logger.info(f"Successfully retrieved {len(history_data.get('results', []))} versions for page {page_id}")
            return history_data
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

    def get_page_creator(self, page_id: str) -> Optional[Dict[str, Any]]:
        """Get page creator information from history.
        
        Args:
            page_id: The ID of the page.
            
        Returns:
            Dict containing creator information or None if not found.
            
        Raises:
            MCPAtlassianAuthenticationError: If authentication fails.
            Exception: For other errors.
        """
        try:
            # Get page with history expanded like api.ts line 110
            page_data = self.confluence.get_content_by_id(
                content_id=page_id,
                expand="history"
            )
            
            if page_data and 'history' in page_data:
                creator = page_data['history'].get('createdBy')
                logger.info(f"Found creator for page {page_id}")
                return creator
                
            logger.warning(f"Creator not found for page {page_id} in history.")
            return None
        except HTTPError as e:
            if e.response.status_code in (401, 403):
                raise MCPAtlassianAuthenticationError(
                    f"Authentication failed for Confluence API: {e.response.status_code}"
                ) from e
            logger.error(f"Error retrieving page creator for {page_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"An unexpected error occurred while retrieving page creator for {page_id}: {e}")
            raise
