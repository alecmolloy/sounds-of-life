import { createMuiTheme, ThemeProvider } from '@material-ui/core'
import * as React from 'react'
import { Helmet } from 'react-helmet'
import { GameOfLife } from './game-of-life'

// TODO: rethink the whole state bridge between react and GOL, can this be done somehow?
// maybe turn the GOL component into a react component?

// TODO: fix selection so it turns off when drawing + make sure mousedown works properly with "newMode"
// TODO: maybe allow users to change size of board, check to see if it is lossy
// TODO: change board size if RLE is too big, warn users
// TODO: a nice UI
// TODO: fix pinch to zoom on safari: https://dev.to/danburzo/pinch-me-i-m-zooming-gestures-in-the-dom-a0e
// TODO: figure out why chrome goes @1x suddenly while resizing or after swapping windows

export const SoundsOfLife: React.FunctionComponent = () => {
  return (
    <ThemeProvider theme={theme}>
      <Helmet>
        {/* <link rel='preconnect' href='https://fonts.gstatic.com' />
        <link
          href='https://fonts.googleapis.com/css2?family=Inter&display=swap'
          rel='stylesheet'
        /> */}
        <style type='text/css'>
          {`
            body {
              margin: 0;
              overflow: hidden;
              background-color: black;
              boxSizing: border-box;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
              font-weight: 400;
            }
            iframe {
              display: none;
            }
            input[type=number]::-webkit-inner-spin-button,
            input[type=number]::-webkit-outer-spin-button {
              margin: 0;
              background-color: pink;
            }
          `}
        </style>
      </Helmet>

      <GameOfLife />
    </ThemeProvider>
  )
}

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#fff',
    },
    secondary: {
      main: '#aaa',
    },
    text: { primary: '#fff', secondary: '#999' },
  },
})
