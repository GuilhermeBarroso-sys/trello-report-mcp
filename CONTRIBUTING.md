# Contributing to trello-report-mcp

Thank you for considering contributing to the Trello Report MCP Server! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone. Please be kind and courteous to others, and avoid any form of harassment or discriminatory behavior.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with the following information:

1. A clear, descriptive title
2. A detailed description of the issue
3. Steps to reproduce the bug
4. Expected behavior
5. Actual behavior
6. Screenshots (if applicable)
7. Environment information (OS, Node.js version, etc.)

### Suggesting Enhancements

If you have an idea for an enhancement, please create an issue with the following information:

1. A clear, descriptive title
2. A detailed description of the enhancement
3. The motivation behind the enhancement
4. Any potential implementation details

### Pull Requests

1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Make your changes
4. Run tests to ensure your changes don't break existing functionality
5. Submit a pull request

#### Pull Request Guidelines

- Follow the existing code style
- Include tests for new features or bug fixes
- Update documentation as needed
- Keep pull requests focused on a single change
- Link to any relevant issues

## Development Setup

1. Clone the repository
   ```bash
   git clone https://github.com/GuilhermeBarroso-sys/trello-report-mcp.git
   cd trello-report-mcp
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file with your Trello API credentials (for local development)
   ```
   TRELLO_API_KEY=your_trello_api_key
   TRELLO_API_TOKEN=your_trello_api_token
   ```

4. Build the project
   ```bash
   npm run build
   ```

5. Run the server
   ```bash
   npm start
   ```

## Project Structure

```
trello-report-mcp/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── server.ts                # MCP server definition
│   ├── trello/
│   │   ├── api.ts               # Trello API client
│   │   ├── types.ts             # TypeScript interfaces
│   │   └── utils.ts             # Helper functions
│   └── tools/
│       ├── listBoards.ts        # Tool to list boards
│       └── generateReport.ts    # Tool to generate reports
├── dist/                        # Compiled JavaScript files
├── .env.example                 # Example environment variables
├── CONTRIBUTING.md              # Contribution guidelines
├── LICENSE                      # ISC License
└── README.md                    # Project documentation
```

## Adding New Features

To add new features or tools to the MCP server:

1. Define any new types in `src/trello/types.ts`
2. Implement new API methods in `src/trello/api.ts` if needed
3. Create a new tool implementation in the `src/tools/` directory
4. Register the new tool in `src/server.ts`

## License

By contributing to this project, you agree that your contributions will be licensed under the project's [ISC License](LICENSE).
