# Using the Trello Report MCP Server with Claude

This document explains how to use the Trello Report MCP server with Claude.

## Available Tools

The Trello Reports MCP server provides two tools:

### 1. list_boards

Lists all your Trello boards with optional search filtering.

**Example prompts:**
- "List all my Trello boards"
- "Show me my Trello boards that contain 'project' in the name"
- "What Trello boards do I have access to?"

### 2. generate_report

Generates a detailed report for a Trello board by quarter or year.

**Example prompts:**
- "Generate a Q1 2023 report for my Project Alpha board"
- "Create a yearly report for 2023 for my Marketing board"
- "Show me the activity on my Development board for Q2 2023"
- "What happened on my Product Roadmap board in Q4 2023?"

## Report Contents

The generated reports include:

- **Board Overview**: Basic information about the board
- **Activity Summary**: Cards created, moved, comments added
- **List Breakdown**: Cards and activity per list
- **Member Activity**: Most active members
- **Label Usage**: Most used labels
- **Card Flow**: How cards moved between lists

## Example Conversation

Here's an example of how you might interact with Claude using the Trello MCP server:

**You:** "Can you list all my Trello boards?"

**Claude:** *Uses the list_boards tool to fetch and display your boards*

**You:** "Generate a Q1 2023 report for the Marketing board"

**Claude:** *Uses the generate_report tool to create and display a detailed report*

**You:** "What was the most active list in that report?"

**Claude:** *Analyzes the report data and answers your question*

## Troubleshooting

If Claude has trouble accessing your Trello boards:

1. Make sure the MCP server is properly configured in the settings file
2. Verify that your Trello API credentials are correct
3. Check that the board names you're referring to actually exist in your Trello account
