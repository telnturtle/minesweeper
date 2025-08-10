import { useCallback, useMemo, useState } from 'react'

type XY = { x: number; y: number }

type UseChordXYOptions = {
  preventContextMenu?: boolean // 우클릭 메뉴 방지 (기본 true)
  mask?: number // 동시클릭 비트마스크 (왼1|오2=3)
  onStart?: (x: number, y: number, e: React.PointerEvent) => void
  onEnd?: (x: number, y: number, e?: React.PointerEvent) => void
  suppressClickWhileChord?: boolean // 동시클릭 중 click 차단 (기본 true)
}

type UserHandlers = Partial<{
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
  onPointerLeave: (e: React.PointerEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
  onClick: (e: React.MouseEvent) => void
}>

export function useChordXY(opts: UseChordXYOptions = {}) {
  const {
    preventContextMenu = true,
    mask = 3,
    onStart,
    onEnd,
    suppressClickWhileChord = true,
  } = opts

  const [isChord, setIsChord] = useState(false)
  const [xy, setXY] = useState<XY | null>(null)

  const setOn = useCallback(
    (xy: XY, e: React.PointerEvent) => {
      setIsChord((prev) => {
        if (!prev) {
          setXY(xy)
          onStart?.(xy.x, xy.y, e)
        }
        return true
      })
    },
    [onStart]
  )

  const setOff = useCallback(
    (e?: React.PointerEvent) => {
      setIsChord((prev) => {
        if (prev && xy) onEnd?.(xy.x, xy.y, e)
        return false
      })
      setXY(null)
    },
    [onEnd, xy]
  )

  const handlePointerDown = useCallback(
    (xy: XY, e: React.PointerEvent) => {
      if (preventContextMenu && (e.buttons & 2) !== 0) e.preventDefault()
      if ((e.buttons & mask) === mask) setOn(xy, e)
    },
    [mask, preventContextMenu, setOn]
  )

  const handlePointerMove = useCallback(
    (xy: XY, e: React.PointerEvent) => {
      const both = (e.buttons & mask) === mask
      if (both) setOn(xy, e)
      else setOff(e)
    },
    [mask, setOn, setOff]
  )

  const handlePointerEnd = useCallback(
    (e?: React.PointerEvent) => {
      setOff(e)
    },
    [setOff]
  )

  /** 좌표와 기존 핸들러를 합성해서 JSX에 펼치기 */
  const getChordProps = useCallback(
    (args: { x: number; y: number } & { handlers?: UserHandlers } = { x: 0, y: 0 }) => {
      const { x, y, handlers = {} } = args
      const xyArg = { x, y }

      return {
        // DOM에서도 좌표가 보이도록 dataset 추가
        'data-x': x,
        'data-y': y,

        onPointerDown: (e: React.PointerEvent) => {
          handlePointerDown(xyArg, e)
          handlers.onPointerDown?.(e)
        },
        onPointerMove: (e: React.PointerEvent) => {
          handlePointerMove(xyArg, e)
          handlers.onPointerMove?.(e)
        },
        onPointerUp: (e: React.PointerEvent) => {
          handlePointerEnd(e)
          handlers.onPointerUp?.(e)
        },
        onPointerCancel: (e: React.PointerEvent) => {
          handlePointerEnd(e)
          handlers.onPointerCancel?.(e)
        },
        onPointerLeave: (e: React.PointerEvent) => {
          handlePointerEnd(e)
          handlers.onPointerLeave?.(e)
        },
        onContextMenu: (e: React.MouseEvent) => {
          if (preventContextMenu) e.preventDefault()
          handlers.onContextMenu?.(e)
        },
        onClick: (e: React.MouseEvent) => {
          if (suppressClickWhileChord && isChord) {
            e.preventDefault()
            e.stopPropagation()
            return
          }
          handlers.onClick?.(e)
        },
      } as const
    },
    [
      handlePointerDown,
      handlePointerMove,
      handlePointerEnd,
      preventContextMenu,
      suppressClickWhileChord,
      isChord,
    ]
  )

  return useMemo(() => ({ isChord, xy, getChordProps }), [isChord, xy, getChordProps])
}
