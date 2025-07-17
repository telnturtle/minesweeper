import { css } from '@emotion/react'
import { clsx } from 'clsx'
import { useState } from 'react'

export function Minesweeper() {
  const [width, setWidth] = useState(15)
  const [height, setHeight] = useState(25)
  const [bombRate, setBombRate] = useState(10)
  const [map, setMap] = useState<boolean[][]>([])
  const [coveredMap, setCoveredMap] = useState<boolean[][]>([])
  const handleClickUncover = (rowIndex: number, cellIndex: number) => {
    if (coveredMap[rowIndex][cellIndex]) {
      setCoveredMap(
        coveredMap.map((row, rowI) =>
          rowI === rowIndex
            ? row.map((cell, cellI) => (cellI === cellIndex ? false : cell))
            : row
        )
      )
    }
  }
  return (
    <>
      <div>
        <label>
          width:
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </label>
        <label>
          height:
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
          />
        </label>
        <label>
          bomb rate (%):
          <input
            type="range"
            min={1}
            max={100}
            value={bombRate}
            onChange={(e) => setBombRate(Number(e.target.value))}
          />
          <span>{`${bombRate}%`}</span>
        </label>
        <button
          onClick={() => {
            setMap(MakeMap(width, height, bombRate / 100))
            setCoveredMap(MakeCoveredMap(width, height))
          }}
        >
          set map
        </button>
      </div>
      <div>
        {map.map((row, rowIndex) => (
          <div
            key={rowIndex}
            css={css`
              display: flex;
            `}
          >
            {row.map((cell, cellIndex) => (
              <button
                key={cellIndex}
                onClick={() => handleClickUncover(rowIndex, cellIndex)}
                css={css`
                  width: 20px;
                  height: 20px;
                  border: none;
                  outline: 0.5px solid rgba(0 0 0 / 0.25);
                  border-radius: 0;
                  background-color: rgb(200 200 200 / 0.6);
                  &.covered {
                    background-color: rgb(200 200 200 / 0.8);
                  }
                  &:hover {
                    filter: brightness(1.1);
                  }
                  &:active {
                    filter: brightness(0.9);
                  }
                  display: inline-flex;
                  justify-content: center;
                  align-items: center;
                `}
                className={clsx({
                  covered: coveredMap[rowIndex][cellIndex],
                  bomb: cell,
                  empty: !cell,
                })}
              >
                {coveredMap[rowIndex][cellIndex] ? ' ' : cell ? '💣' : '🌱'}
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

function MakeMap(width: number, height: number, bombRate: number): boolean[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => Math.random() < bombRate)
  )
}
function MakeCoveredMap(width: number, height: number): boolean[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => true))
}
