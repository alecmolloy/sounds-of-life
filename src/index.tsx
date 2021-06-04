import * as React from 'react'
import { render } from 'react-dom'
import Recoil from 'recoil'
import { SoundsOfLife } from './sounds-of-life'

const rootElement = document.getElementById('root')
render(
  <Recoil.RecoilRoot>
    <SoundsOfLife />
  </Recoil.RecoilRoot>,
  rootElement,
)
