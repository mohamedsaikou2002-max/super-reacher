# Build Super Reacher

## Goal
Create a polished, usable Super Reacher dashboard based on the uploaded outreach workflow, with a lime-green linear-gradient identity and copy-ready HTML email generation.

## Experience
- Replace the placeholder home page with an outreach workspace.
- Add a compact sidebar, campaign overview, performance metrics, and recent lead activity.
- Add an email composer where users choose a market and industry, enter business details, and edit the generated subject and message.
- Show a rendered email preview alongside the fields.
- Provide one-click copy actions for the complete HTML email and subject line, with visible success feedback.
- Include reusable localized starter content for the supported countries from the uploaded project.
- Add a simple leads view and campaign controls using realistic sample data from the product context.

## Visual Direction
- Dark graphite workspace with crisp light surfaces and a vivid lime-green linear gradient for primary actions and key metrics.
- Dense, professional operations-console layout with restrained borders, compact typography, and minimal rounded corners.
- Responsive behavior: sidebar collapses into a compact top bar and the composer stacks cleanly on smaller screens.

## Technical Details
- Implement as a TanStack Start page at `/` using React state for immediate interactions.
- Define all palette, gradient, typography, shadow, and focus values as semantic tokens in the global design system.
- Use accessible labels, semantic page structure, keyboard-friendly controls, tooltips where needed, and reduced-motion support.
- Add unique home-page title, description, Open Graph, and Twitter metadata.
- Keep this frontend-only: generated emails and demo leads remain in the browser and no messages are sent.
- Verify desktop and mobile rendering plus copy/composer interactions in the running preview.
