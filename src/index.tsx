import { render } from 'react-dom'
import * as React from 'react'
import { SoundsOfLife } from './sounds-of-life'

declare module 'react-p5'

const rootElement = document.getElementById('root')
render(<SoundsOfLife />, rootElement)
