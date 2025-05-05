# Unbound Text

## What is this?

Unbound Text is a tool to format text for compilation within the [CFRU](https://github.com/Skeli789/Complete-Fire-Red-Upgrade).

- The production site can be accessed from [here](https://skeli789.github.io/Unbound-Text/).

## Features
- **Auto Formatting**
  - Never worry about textbox overflow!
- **Text Prettifier**
  - Format the text for maximum readability with the click of a button!
- **Undo/Redo**
  - Easily revert mistaken changes!
- **Colour Highlighing**
  - View the text with the colours as it would appear in the game!
- **Auto-Save**
  - Every change is saved so you don't lose your work!
- **Translation**
  - Translate from English to other languages!

## Develop Locally

To run the `master` branch locally for development purposes, the steps are as follows:

1. Install [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/).

1. Install the dependencies with:
    ```bash
    yarn install
    ```

1. Create a file `.env.development.local` and add the contents:
    ```js
    VITE_TRANSLATION_EMAIL="<YOUR_EMAIL>"
    ```
    Where `<YOUR_EMAIL>` is replaced with your actual email.

1. Run the client with:
    ```bash
    yarn start
    ```

1. Visit http://localhost:3000 in your browser to access the site.
