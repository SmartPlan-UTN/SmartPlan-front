This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Fonts

This project uses [`next/font/local`](https://nextjs.org/docs/app/api-reference/components/font) to self-host **Bricolage Grotesque**, the project's typeface.

- The variable font file lives at [`src/app/fonts/BricolageGrotesque-Variable.ttf`](src/app/fonts/BricolageGrotesque-Variable.ttf) (sourced from [Google Fonts](https://fonts.google.com/specimen/Bricolage+Grotesque), licensed under the [SIL Open Font License](https://openfontlicense.org/)).
- It's loaded once in [`src/app/layout.tsx`](src/app/layout.tsx) with `weight: "200 800"`, since it's a variable font — this exposes every weight in that range instead of a fixed set.
- The loader exposes the font family as the CSS variable `--font-bricolage-grotesque`, which is mapped to Tailwind's `--font-sans` in [`src/app/globals.css`](src/app/globals.css). Use it via the `font-sans` utility class, together with any weight utility from `font-extralight` (200) through `font-extrabold` (800).
- The default Geist / Geist Mono fonts from the `create-next-app` template were removed in favor of this font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
