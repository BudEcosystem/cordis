import { Context } from '../src'
import { Message } from '../src/logger'
import { describe, expect, it, vi } from 'vitest'
import { sleep } from './utils'

function setup() {
  const root = new Context()
  const errors: Message[] = []
  root.logger.exporter({ colors: 0, levels: { default: 1 }, export: (msg) => errors.push(msg) })
  return { root, errors }
}

describe('Fiber: disposal during startup', () => {
  it('runs no plugin whose fiber was disposed before its first checkpoint', async () => {
    const { root, errors } = setup()
    const apply = vi.fn((ctx: Context) => { ctx.effect(() => () => {}) })
    const fiber = root.plugin(apply)
    fiber.dispose()
    await sleep(10)
    expect(apply.mock.calls).toHaveLength(0)
    expect(errors.map(msg => String(msg.args[0]))).toEqual([])
  })

  it('runs no plugin whose parent began unloading before the plugin\'s first checkpoint', async () => {
    const { root, errors } = setup()
    const child = vi.fn((ctx: Context) => { ctx.effect(() => () => {}) })
    const parent = root.plugin((ctx: Context) => {
      ctx.plugin(child)
      ctx.fiber.dispose()
    })
    await sleep(20)
    expect(child.mock.calls).toHaveLength(0)
    expect(errors.map(msg => String(msg.args[0]))).toEqual([])
    await parent.dispose()
  })
})
