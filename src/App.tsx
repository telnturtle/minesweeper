import { css } from '@emotion/react'
import { Minesweeper } from './Minesweeper'

function App() {
  return (
    <>
      <Minesweeper
        css={css`
          height: 100dvh;
          width: 100dvw;
        `}
      />
    </>
  )
}

export default App
