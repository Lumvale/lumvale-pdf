# Contributing to LumvalePDF

First off, thank you for considering contributing to LumvalePDF! It's people like you that make LumvalePDF a great open-source tool. 

## How Can I Contribute?

### 1. Requesting Features & Reporting Bugs
If you find a bug or have a feature request, please open an issue on our GitHub repository. 
- Use the **Bug Report** template if something is broken. Provide as much detail as possible, including OS, LumvalePDF version, and steps to reproduce.
- Use the **Feature Request** template for new ideas. Explain *why* the feature is needed and how it would improve the offline PDF experience.

### 2. UI / UX Testing
We care deeply about a premium, native-feeling user experience. You can contribute heavily by:
- Testing the application on different screen sizes and operating systems.
- Finding contrast issues in both Light and Dark modes.
- Suggesting improvements to micro-animations or accessibility.

### 3. Developing Code (Core Engine & UI)

To contribute code:

1. **Fork the repository** and clone your fork locally.
2. **Create a branch** for your feature or bug fix: `git checkout -b feature/my-new-feature`
3. **Setup the project**: Follow the `Quick Start` instructions in the README to launch the dev server.
4. **Make your changes**. Ensure that:
   - Core PDF engine logic is added to the `core/` package.
   - React components and Tailwind styling are added to the `ui/` package.
5. **Run tests**: We use Playwright for E2E testing. Run `npx playwright test` inside the `ui` directory before submitting.
6. **Commit**: Write clear, descriptive commit messages.
7. **Submit a Pull Request (PR)**: Push your branch to GitHub and open a PR against the `main` branch.

## Development Guidelines
- **Offline First**: All new features *must* be capable of running entirely offline on the client machine via WebAssembly or local execution. We do not accept features that require external cloud APIs.
- **Styling**: We use Tailwind CSS v4. Stick to the predefined pastel and dark mode theme tokens.

Thank you for helping us build the best offline PDF toolkit!

## Open-source boundary (please read)

lumvale-pdf is a **standalone, fully open-source community tool** (Apache-2.0), developed in
the open. It must stay free of any private or commercial code:

- **No private/commercial dependencies or imports.** Do not depend on, or import from, private
  Lumvale packages.
- **No secrets or internal details.** Never commit credentials, internal infrastructure, or
  non-public roadmap/customer information — in code, comments, commits, or issues. Every PR is
  public.
- **Dependency direction is one-way.** Commercial products (e.g. Lumvale Omnia) consume this
  engine as a published package; they depend on us, never the reverse.

CI enforces this on every PR (open-source boundary check, secret scan, LICENSE + dependency
license checks). By contributing, you agree your contribution is licensed under Apache-2.0.
