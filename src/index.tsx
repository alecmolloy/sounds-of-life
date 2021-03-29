import * as React from 'react'
import { render } from 'react-dom'
import { SoundsOfLife } from './sounds-of-life'

declare module 'react-p5'

const rootElement = document.getElementById('root')
render(<SoundsOfLife />, rootElement)
