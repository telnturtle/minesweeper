import { clsx } from 'clsx'
import { range } from 'es-toolkit'
import { useCallback, useEffect, useRef, useState } from 'react'

export const Minesweeper: React.FC = (() => {
  const c = {
    uncover: (coveredMap: boolean[][], rowIndex: number, cellIndex: number) => {
      return coveredMap.map((row, rowI) =>
        rowI === rowIndex
          ? row.map((cell, cellI) => (cellI === cellIndex ? false : cell))
          : row
      )
    },
    styles: {},
    directions: [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ] as [number, number][],
    isSafe: (map: boolean[][], rowIndex: number, cellIndex: number) => {
      return !map[rowIndex][cellIndex]
    },
    isInMap: (map: boolean[][], rowIndex: number, cellIndex: number) => {
      return (
        rowIndex >= 0 &&
        rowIndex < map.length &&
        cellIndex >= 0 &&
        cellIndex < map[0].length
      )
    },
    isDoubleSafe: (map: boolean[][], rowIndex: number, cellIndex: number) => {
      return c.directions.every(([dx, dy]) => {
        const x = rowIndex + dx
        const y = cellIndex + dy
        return !c.isInMap(map, x, y) || c.isSafe(map, x, y)
      })
    },
    getBombNeighbors: (map: boolean[][], rowIndex: number, cellIndex: number) => {
      return c.directions
        .map(([dx, dy]) => [rowIndex + dx, cellIndex + dy])
        .filter(([x, y]) => c.isInMap(map, x, y) && map[x][y])
    },
  }
  return function Minesweeper() {
    const numberColorClass: Record<number, string> = {
      1: 'text-blue-600',
      2: 'text-green-600',
      3: 'text-red-600',
      4: 'text-indigo-600',
      5: 'text-orange-600',
      6: 'text-cyan-600',
      7: 'text-purple-700',
      8: 'text-slate-900',
    }
    const { isSafe, isInMap, isDoubleSafe } = c
    const touchTimer = useRef<number | null>(null)
    const [width, setWidth] = useState(15)
    const [height, setHeight] = useState(25)
    const [bombRate, setBombRate] = useState(20)
    const [gameStatus, setGameStatus] = useState<'ready' | 'playing' | 'won' | 'lost'>(
      'ready'
    )
    const initialCoordinate = useRef<[number, number] | null>(null)
    // map: true cell 은 폭탄, false cell 은 안전
    const [map, setMap] = useState<boolean[][]>([])
    const [coveredMap, setCoveredMap] = useState<boolean[][]>([])
    const [flagMap, setFlagMap] = useState<boolean[][]>([])

    // 지도 전체에서 폭탄, 깃발, 덮인 셀 개수를 즉시 계산해 UI 및 판정에 활용한다.
    const totalMines: number = map.flat().filter(Boolean).length
    const totalFlags: number = flagMap.flat().filter(Boolean).length
    const remainMines: number = totalMines - totalFlags

    const [explodedCellSet, setExplodedCellSet] = useState<Set<string>>(new Set())

    const [isLostProcessing, setIsLostProcessing] = useState<boolean>(false)

    // 폭탄을 클릭했을 때 패배 애니메이션을 처리하는 핵심 진입점이다.
    const lose = (rowIndex: number, cellIndex: number) => {
      setIsLostProcessing(true)
      // 클릭된 셀을 언커버.
      setCoveredMap((coveredMap) => {
        return coveredMap.map((row, rowI) =>
          rowI === rowIndex
            ? row.map((cell, cellI) => (cellI === cellIndex ? false : cell))
            : row
        )
      })
      // 아직 깃발이 꼽히지 않은 폭탄 셀을 모두 구한다.
      const bombCells = range(0, map.length)
        .map((rowI) => range(0, map[0].length).map((cellI) => [rowI, cellI]))
        .flat()
        .filter(([rowI, cellI]) => map[rowI][cellI] && !flagMap[rowI][cellI])

      const noiseSeed = rowIndex * 73856093 + cellIndex * 19349663
      const sampleNoise = (x: number, y: number) => {
        const raw =
          Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233 + noiseSeed) * 43758.5453
        return raw - Math.floor(raw)
      }
      const weightedDistance = (x: number, y: number) => {
        const distance = Math.abs(x - rowIndex) + Math.abs(y - cellIndex)
        return distance + sampleNoise(x, y) * 0.75
      }
      const mixedBombCells = [...bombCells].sort((a, b) => {
        return weightedDistance(a[0], a[1]) - weightedDistance(b[0], b[1])
      })

      // 노이즈가 섞인 순서대로 폭탄을 폭발시킨다.
      const cellsToExplode =
        mixedBombCells.length > 0 ? mixedBombCells : [[rowIndex, cellIndex]]
      const explosionIntervalMs = 30
      cellsToExplode.forEach(([x, y], index) => {
        window.setTimeout(() => {
          setExplodedCellSet((prev) => {
            const next = new Set(prev)
            next.add(`${x},${y}`)
            return next
          })
        }, index * explosionIntervalMs)
      })

      const finishDelay = cellsToExplode.length * explosionIntervalMs
      window.setTimeout(() => {
        setIsLostProcessing(false)
        setGameStatus('lost')
      }, finishDelay)
    }

    const handleClickUncover = useCallback(
      (rowIndex: number, cellIndex: number) => {
        if (coveredMap[rowIndex][cellIndex] && isSafe(map, rowIndex, cellIndex)) {
          /** coordinatesToOpen 에 들어있는 좌표들은 열린다. 첫 좌표를 넣어둔다. */
          const coordinatesToOpen = [[rowIndex, cellIndex]]
          /** coordinatesToOpenSet 는 coordinatesToOpen 에 중복된 좌표가 들어가는 것을 방지한다. */
          const coordinatesToOpenSet = new Set<string>([`${rowIndex},${cellIndex}`])
          /** BFS 를 사용해 재귀적으로 탐색한다. 만약 double safe 한 좌표라면 첫 좌표를 넣어둔다. */
          const coordinatesToBfs = isDoubleSafe(map, rowIndex, cellIndex)
            ? [[rowIndex, cellIndex]]
            : []
          // BFS
          while (coordinatesToBfs.length > 0) {
            const item = coordinatesToBfs.shift()
            // 타입 에러 방지
            if (!item) break
            const [x, y] = item

            // 8-way uncover
            c.directions
              .map(([dx, dy]) => [x + dx, y + dy])
              .forEach(([x, y]) => {
                if (
                  isInMap(map, x, y) &&
                  isSafe(map, x, y) &&
                  !coordinatesToOpenSet.has(`${x},${y}`)
                ) {
                  // safe 한 좌표는 열린다.
                  coordinatesToOpen.push([x, y])
                  if (isDoubleSafe(map, x, y)) {
                    // double safe 한 좌표는 BFS 추가 탐색 대상이 된다.
                    coordinatesToBfs.push([x, y])
                  }
                  coordinatesToOpenSet.add(`${x},${y}`)
                }
              })
          }
          // 열릴 좌표들을 연다.
          setCoveredMap((coveredMap) => {
            coordinatesToOpen.forEach(([x, y]) => {
              coveredMap = c.uncover(coveredMap, x, y)
            })
            return coveredMap
          })
        }
      },
      [coveredMap, isDoubleSafe, isInMap, isSafe, map]
    )

    // 게임이 진행 중이고 남은 폭탄(=깃발 차이)이 없으면 승리 처리한다.
    useEffect(() => {
      if (gameStatus === 'playing') {
        if (remainMines === 0) {
          setGameStatus('won')
        }
      }
    }, [gameStatus, remainMines])

    // 게임을 리셋하거나 시작할 때 첫 클릭 상태를 동기화한다.
    useEffect(() => {
      const isGameReady = gameStatus === 'ready'
      if (isGameReady) {
        // reset 버튼을 누르면 첫 클릭 좌표를 초기화한다.
        initialCoordinate.current = null
      } else {
        // 첫 클릭되었다. 게임이 시작됨.
        if (initialCoordinate.current) {
          handleClickUncover(initialCoordinate.current[0], initialCoordinate.current[1])
        }
      }
    }, [gameStatus, handleClickUncover])

    return (
      <>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            width:
            <input
              type="number"
              value={width}
              className="w-16 rounded border border-neutral-400 bg-white px-2 py-1 text-black"
              onChange={(e) => setWidth(Number(e.target.value))}
            />
          </label>
          <label className="flex items-center gap-2">
            height:
            <input
              type="number"
              value={height}
              className="w-16 rounded border border-neutral-400 bg-white px-2 py-1 text-black"
              onChange={(e) => setHeight(Number(e.target.value))}
            />
          </label>
          <label className="flex items-center gap-2">
            bomb probability (%):
            <input
              type="range"
              min={1}
              max={100}
              value={bombRate}
              className="h-2 w-32 cursor-pointer accent-emerald-500"
              onChange={(e) => setBombRate(Number(e.target.value))}
            />
            <span>{`${bombRate}%`}</span>
          </label>
          <button
            className="rounded bg-emerald-600 px-3 py-1 font-semibold text-white transition-colors hover:bg-emerald-500 active:bg-emerald-700"
            onClick={() => {
              setMap(MakeMap(width, height, bombRate / 100, []))
              setCoveredMap(MakeCoveredMap(width, height))
              setFlagMap(MakeFlagMap(width, height))
              setGameStatus('ready')
              setExplodedCellSet(new Set())
            }}
          >
            {/* Reset 버튼은 게임 시작 전 상태로 만든다 */}
            Reset
          </button>
        </div>
        <div>
          {gameStatus === 'ready'
            ? `${0} 💣 / ${0} 🚩 / ${0} 🔎`
            : `${totalMines} 💣 / ${totalFlags} 🚩 / ${totalMines - totalFlags} 🔎`}
        </div>
        {/* 패배 애니메이션 중에는 입력을 막는다. */}
        <div
          className={clsx({
            'pointer-events-none': isLostProcessing,
          })}
        >
          {map.map((row, rowIndex) => (
            <div key={rowIndex} className="flex select-none">
              {/* 전체 drag 방지 */}
              {row.map((cell, cellIndex) => (
                <button
                  key={cellIndex}
                  onClick={() => {
                    if (gameStatus === 'ready') {
                      // 첫 클릭 시 map 생성
                      // safe coordinates: self, 8-neighbors
                      setMap(
                        MakeMap(width, height, bombRate / 100, [
                          [rowIndex, cellIndex],
                          ...c.directions
                            .map(
                              ([dx, dy]) =>
                                [rowIndex + dx, cellIndex + dy] as [number, number]
                            )
                            .filter(([x, y]) => c.isInMap(map, x, y)),
                        ])
                      )
                      setGameStatus('playing')
                      initialCoordinate.current = [rowIndex, cellIndex]
                    } else if (gameStatus === 'playing') {
                      // 첫 클릭이 아닌 게임 중 클릭
                      if (isSafe(map, rowIndex, cellIndex)) {
                        // 클릭된 셀이 안전함
                        handleClickUncover(rowIndex, cellIndex)
                      } else {
                        // 클릭된 셀이 폭탄임
                        lose(rowIndex, cellIndex)
                      }
                    }
                  }}
                  className={clsx(
                    'w-[25px] h-[25px] min-w-[25px] min-h-[25px] shrink-0 border border-transparent outline outline-1 outline-black/25 rounded-none inline-flex items-center justify-center select-none text-base font-semibold leading-none transition-[filter] hover:brightness-110 active:brightness-90',
                    coveredMap[rowIndex][cellIndex]
                      ? 'bg-[rgba(200,200,200,0.8)]'
                      : 'bg-[rgba(200,200,200,0.4)]',
                    {
                      covered: coveredMap[rowIndex][cellIndex],
                      bomb: cell,
                      empty: !cell,
                      doubleSafe: isDoubleSafe(map, rowIndex, cellIndex),
                    }
                  )}
                  contextMenu="none"
                  // 우클릭 시 flag set
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setFlagMap((flagMap) => {
                      return flagMap.map((row, rowI) =>
                        row.map((cell, cellI) =>
                          cellI === cellIndex && rowI === rowIndex ? !cell : cell
                        )
                      )
                    })
                  }}
                  onTouchStart={() => {
                    touchTimer.current = setTimeout(() => {
                      // 500ms 이상 누르면 깃발
                      setFlagMap((flagMap) => {
                        return flagMap.map((row, rowI) =>
                          row.map((cell, cellI) =>
                            cellI === cellIndex && rowI === rowIndex ? !cell : cell
                          )
                        )
                      })
                    }, 500)
                  }}
                  onTouchEnd={() => {
                    if (touchTimer.current) {
                      clearTimeout(touchTimer.current)
                    }
                  }}
                  onTouchCancel={() => {
                    if (touchTimer.current) {
                      clearTimeout(touchTimer.current)
                    }
                  }}
                  disabled={['won', 'lost'].includes(gameStatus)}
                >
                  {(() => {
                    const isExploded = explodedCellSet.has(`${rowIndex},${cellIndex}`)
                    const isCovered = coveredMap[rowIndex][cellIndex]
                    if (isExploded) {
                      return isCovered ? '💣' : '💥'
                    }
                    if (isCovered) {
                      const isFlagged = flagMap[rowIndex][cellIndex]
                      return isFlagged ? '🚩' : ' '
                    }
                    const isBomb = cell
                    if (isBomb) {
                      return '💥'
                    }
                    if (isDoubleSafe(map, rowIndex, cellIndex)) {
                      return ' '
                    }
                    const neighborCount = c.getBombNeighbors(map, rowIndex, cellIndex).length
                    if (neighborCount === 0) {
                      return ' '
                    }
                    return (
                      <span className={numberColorClass[neighborCount] ?? 'text-slate-900'}>
                        {neighborCount}
                      </span>
                    )
                  })()}
                </button>
              ))}
            </div>
          ))}
        </div>
        {gameStatus}
      </>
    )
  }
})()

/** safeCoordinates 에 있는 좌표는 모두 false 로 만든다. (안전) */
function MakeMap(
  width: number,
  height: number,
  bombRate: number,
  safeCoordinates: [number, number][]
): boolean[][] {
  return Array.from({ length: height }, (_, rowIndex) =>
    Array.from({ length: width }, (_, cellIndex) => {
      return safeCoordinates.some(([x, y]) => x === rowIndex && y === cellIndex)
        ? false
        : Math.random() < bombRate
    })
  )
}
function MakeCoveredMap(width: number, height: number): boolean[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => true))
}
function MakeFlagMap(width: number, height: number): boolean[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => false))
}

// '💣'
// '🌱'
// '🚩'
