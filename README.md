# LLMTree

<p>
  <img src="https://github.com/acrognale/llmtree/blob/main/packages/llmtree/public/logo.png" alt="LLMTree logo" width="100" height="100">
</p>

LLMTree is a large language model client that places chats on an infinite canvas, allowing users to fork and branch conversations.

![Sped up LLMTree](https://github.com/acrognale/llmtree/blob/main/media/spedup.webp)

<a href="https://discord.gg/Qu5SKnVZhe">
  <img src="https://img.shields.io/badge/Join-Discord-blue.svg"/>
</a>

## Download

[Download the latest version here](https://github.com/acrognale/llmtree/releases/latest)

More builds besides MacOS coming soon.

## Features

- Multiple canvas support for organizing thoughts and conversations
- Markdown and LaTeX rendering for rich text responses
- Onboarding process for new users
- Electron-based desktop application for cross-platform support

### Fork and branch entire conversations to explore different ideas

![Forking a conversation](https://github.com/acrognale/llmtree/blob/main/media/fork.webp)

### Reply to a message in a canvas

![Replying to a message](https://github.com/acrognale/llmtree/blob/main/media/reply.webp)

## Supported LLM providers

- [OpenAI](https://platform.openai.com/)
- [Anthropic](https://www.anthropic.com/)
- [Groq](https://www.groq.com/)
- [Gemini](https://gemini.google.com/)

## Planned Features

- [ ] Support for more LLM providers (add everything else already supported by litellmjs)

## Keyboard Shortcuts

| Key            | Action                    |
| -------------- | ------------------------- |
| `f`            | Zoom to a 50% zoom level  |
| `g`            | Zoom to a 100% zoom level |
| `z`            | Zoom to fit               |
| `meta+shift+m` | Open the model switcher   |
| `cmd+,`        | Open the settings modal   |

## Setting up for development

1. Clone the repository:

```
git clone https://github.com/acrognale/llmtree.git
```

2. Navigate to the project directory:

```
cd llmtree
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
