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

Generates a report for a Trello board by quarter or year. The report can be in two formats:
- **Full Report**: Detailed report with all sections (default)
- **Summary Report**: Concise report with key insights and recommendations

**Example prompts:**
- "Generate a Q1 2023 report for my Project Alpha board"
- "Create a yearly report for 2023 for my Marketing board"
- "Show me the activity on my Development board for Q2 2023"
- "What happened on my Product Roadmap board in Q4 2023?"
- "Give me a summary report for my Marketing board for Q1 2023"
- "I need a concise summary of my Development board's activity for 2023"

## Report Contents

### Full Report (Default)

The detailed reports include:

- **Board Overview**: Basic information about the board
- **Activity Summary**: Cards created, moved, comments added
- **List Breakdown**: Cards and activity per list
- **Member Activity**: Most active members
- **Label Usage**: Most used labels
- **Card Flow**: How cards moved between lists
- **Work Summary**: Overview of completed work
- **Completed Features**: Details of completed cards grouped by label
- **Key Cards**: Detailed information about the most active cards
- **Work In Progress**: Current work in progress

### Summary Report

The concise summary reports include:

- **Overall Activity**: High-level metrics and statistics
- **Team Activity**: Most active team members
- **Work Completed**: Summary of completed work
- **Key Focus Areas**: Most important cards being worked on
- **Workflow Analysis**: Insights about the workflow process
- **Current Work**: Brief overview of work in progress
- **Recommendations**: Actionable suggestions based on the data

## Example Conversation

Here's an example of how you might interact with Claude using the Trello MCP server:

**You:** "Can you list all my Trello boards?"

**Claude:** *Uses the list_boards tool to fetch and display your boards*

**You:** "Generate a Q1 2023 report for the Marketing board"

**Claude:** *Uses the generate_report tool to create and display a detailed report*

**You:** "What was the most active list in that report?"

**Claude:** *Analyzes the report data and answers your question*

**You:** "Give me a summary report for the same board and period"

**Claude:** *Uses the generate_report tool with format="summary" to create a concise report with insights*

**You:** "What recommendations do you have based on this data?"

**Claude:** *Highlights the recommendations from the summary report*

## Troubleshooting

If Claude has trouble accessing your Trello boards:

1. Make sure the MCP server is properly configured in the settings file
2. Verify that your Trello API credentials are correct
3. Check that the board names you're referring to actually exist in your Trello account
