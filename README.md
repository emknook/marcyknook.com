# marcyknook.com

A playful personal portfolio presented as a tiny desktop environment.

Instead of moving through a traditional sequence of web pages, visitors open, move, resize, close, and arrange application-like windows. Each window reveals a different part of the portfolio, while small interactive details make the site feel like a personal space rather than a formal résumé.

## Concept

The website combines two ideas:

1. **A personal portfolio** — a place to introduce Marcy, show her technical stack, and share projects.
2. **A miniature operating system** — content lives inside colourful windows that behave like desktop applications.

The interface is intentionally a little whimsical. It should feel exploratory and handmade while remaining understandable to someone visiting for the first time.

The desktop metaphor also makes the portfolio expandable: a new subject, project, experiment, or game can become another application without redesigning the entire site.

## Current applications

### Who is Marcy?

The main introduction window. This is intended to explain who Marcy is, what she enjoys making, and what kind of developer she is.

### Tech stack

A place for the technologies, tools, and working methods Marcy uses.

### Projects

A visual overview of selected work. The current version includes a carousel and links to external project material.

### Snake

A small playable Snake game built with the Canvas API. It includes:

- Keyboard controls using the arrow keys or WASD
- A direction queue for quick successive inputs
- Pause and resume with the spacebar
- Multiple berries on the board
- Local high-score storage
- Collision detection for walls and the snake itself

### Settings

A development-facing view of the locally stored desktop and application settings. It currently includes a reset action and shows saved window information.

## Desktop interaction

Applications can be opened from the navigation bar on the left.

Windows can be:

- Brought to the foreground
- Dragged around the desktop
- Resized
- Closed
- Expanded to fill the available space
- Snapped to halves or corners of the screen

Window positions, dimensions, open applications, stacking order, and game information are saved in the browser's local storage. This allows the desktop to retain its arrangement between visits.

## Visual direction

Each application has its own identifying colour:

- Magenta — introduction
- Yellow — technical stack
- Red — projects
- Green — Snake
- Blue — settings

The dark background, bright colours, compact navigation, pixel-inspired type, and window controls create a mixture of retro-computer UI and a modern personal dashboard.

The intended tone is:

- Personal rather than corporate
- Playful without becoming difficult to use
- Colourful but visually consistent
- Experimental while still accessible
- A portfolio that feels like something Marcy made, not a template she filled in

## Project structure

```text
.
├── images/              Static images and the favicon
├── js/
│   ├── script.js        Desktop, window, settings, and carousel behaviour
│   └── snake.js         Snake game state, input, drawing, and collision logic
├── styling/
│   └── custom.css       Layout, window styling, colours, and component styles
└── index.html           Application markup and script/style entry point
```

The project uses plain HTML, CSS, and JavaScript. It does not currently require a build step.

## Running locally

Clone the repository and serve its root directory with any static web server.

For example, with Python:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

Opening `index.html` directly may also work, but using a local server more closely resembles normal website hosting.

## Design principles for future work

When expanding the website:

1. **Keep applications focused.** Each window should have one clear subject or purpose.
2. **Preserve the desktop metaphor.** New content should feel like part of the same miniature operating system.
3. **Make interaction discoverable.** Whimsy should add character, not hide essential controls.
4. **Support touch as well as mouse and keyboard.** Window and game interactions should remain usable on mobile devices.
5. **Respect visitors' preferences.** Motion, contrast, font size, and stored settings should eventually be configurable.
6. **Keep experiments isolated.** Games and unusual interactions should not make the portfolio content harder to reach.
7. **Prefer small, understandable code.** The project is deliberately lightweight and should remain pleasant to explore.

## Possible next steps

- Fill the introduction and tech-stack applications with finished content
- Turn projects into individual cards or application windows
- Improve mobile window behaviour
- Add touch controls to Snake
- Add more personality to the Snake graphics
- Add keyboard-accessible window controls
- Improve focus handling and screen-reader labels
- Add reduced-motion and contrast preferences
- Separate the desktop manager, carousel, settings, and application logic
- Add lightweight tests for stored settings and Snake game rules
- Add a clear first-visit hint explaining how the desktop works

## Status

This is an evolving personal project and interface experiment. Some applications are still placeholders, and the desktop system is being improved gradually as new ideas are explored.
