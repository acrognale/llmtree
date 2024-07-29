# LLMTree

LLMTree is an intelligent AI assistant that allows users to explore different chains of thought using various language models. It provides a unique interface for branching conversations and visualizing thought processes.

## Description

LLMTree is designed to enhance the interaction between users and language models. It allows users to create multiple canvases, each representing a different conversation or thought process. The application supports branching conversations, enabling users to explore various ideas stemming from a single response.

## Features

- Multiple canvas support for organizing thoughts and conversations
- Branching conversations to explore different ideas
- Markdown and LaTeX rendering for rich text responses
- Onboarding process for new users
- Electron-based desktop application for cross-platform support

## Keyboard Shortcuts

| Key | Action                    |
| --- | ------------------------- |
| `f` | Zoom to a 50% zoom level  |
| `g` | Zoom to a 100% zoom level |
| `z` | Zoom to fit               |

## Installation

1. Clone the repository:

```
git clone https://github.com/acrognale/llmtree.git
```

2. Navigate to the project directory:

```
cd LLMTree
```

3. Install dependencies:

```
pnpm install
```

4. Launch the application:

```
pnpm run dev
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Credits

This package makes heavy use of [litellmjs](https://github.com/zya/litellmjs). I have forked the package and included it within the monorepo of LLMTree as I had some significant changes in mind for how the package works, particularly around how handlers are determined (instead of using model names, use a provider name to disambiguate the same model across different providers). As time permits, and if the maintainer is interested, I'd love to get a PR upstream.

Much of the boilerplate around setting up vite + electron comes from [electron-vite-samples](https://github.com/caoxiemeihao/electron-vite-samples).

## License

LLMTree itself is licensed under the [Apache 2.0 License](LICENSE). [litellmjs](https://github.com/zya/litellmjs) is licensed under the [MIT](https://github.com/acrognale/llmtree/blob/main/packages/litellm/LICENSE).
