from pathlib import Path

import pytest
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


@pytest.mark.asyncio
async def test_given_mcp_client_when_initialized_then_narrow_tools_are_discoverable(
    app_repo: Path,
) -> None:
    server = StdioServerParameters(
        command="uv",
        args=["run", "gold-pasal-mcp"],
        cwd=str(app_repo),
    )

    async with stdio_client(server) as (reader, writer):
        async with ClientSession(reader, writer) as session:
            await session.initialize()
            tools = await session.list_tools()

    names = {tool.name for tool in tools.tools}
    assert "catalog_search" in names
    assert "get_order_status" in names
    assert "create_hold" in names
    assert "shell" not in names
    assert "sql" not in names


@pytest.mark.asyncio
async def test_given_invalid_search_arguments_when_tool_is_called_then_schema_rejects_them(
    app_repo: Path,
) -> None:
    server = StdioServerParameters(
        command="uv",
        args=["run", "gold-pasal-mcp"],
        cwd=str(app_repo),
    )

    async with stdio_client(server) as (reader, writer):
        async with ClientSession(reader, writer) as session:
            await session.initialize()
            result = await session.call_tool(
                "catalog_search",
                arguments={"query": "", "limit": 10_000},
            )

    assert result.isError is True
