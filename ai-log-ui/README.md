# AI Log Explainer – Frontend

A modern, professional-grade Next.js application for instant log analysis and explanation. Designed with a robust design system, dark/light theming, and a beautiful, responsive UI.

## Features

- **Instant Log Analysis**: Paste any log file and get clear, AI-powered explanations in seconds.
- **Modern UI/UX**: Built with a custom design system, professional theming, and interactive components.
- **Dark & Light Theme**: Toggle between dark and light modes with a single click.
- **Optimized Typography**: Uses the Inter font for clean, readable text across all devices.
- **Component Architecture**: All UI elements are modular, reusable, and organized for scalability.
- **Responsive Design**: Looks great on desktop, tablet, and mobile.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript, React 19
- **Styling**: Tailwind CSS v4, CSS custom properties (design tokens)
- **Font**: [Inter](https://rsms.me/inter/) via [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
- **Component System**: `/components/ui/` folder with barrel exports for clean imports

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

3. **Open the app:**
   Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Customization & Theming

- **Global Styles:** All colors, radii, shadows, and typography are managed via CSS custom properties in `app/globals.css`.
- **Theme Toggle:** The theme can be switched using the button in the header. Theme state is persisted in localStorage.
- **Font:** The Inter font is loaded and optimized via Next.js's built-in font system.

## Folder Structure

```
ai-log-ui/
├── app/
│   ├── globals.css         # Design tokens and global styles
│   ├── layout.tsx          # Root layout, theme, and font setup
│   └── page.tsx            # Main application view
├── components/
│   └── ui/                 # All UI primitives and components
│       ├── Card/
│       ├── Button/
│       ├── Input/
│       ├── Textarea/
│       ├── Badge/
│       ├── LoadingSpinner/
│       ├── ErrorAlert/
│       ├── SeverityBadge/
│       └── CopyButton/
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Open a pull request

## License

This project is licensed under the MIT License.

## Credits

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Inter Font](https://rsms.me/inter/)

---

For backend setup and API details, see the main project README.