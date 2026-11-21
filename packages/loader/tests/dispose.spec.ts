import { expect, describe, it } from 'vitest'
import { Context } from 'cordis'
import MockLoader, { sleep } from './utils'

describe('Loader: a tree disposed during startup', () => {
  it('applies no entry whose tree was disposed while its module was importing', async () => {
    const root = new Context()
    const errors: string[] = []
    root.logger.exporter({ levels: { default: 1 }, export: (message) => { errors.push(String(message.args[0])) } })
    const fiber = root.plugin(MockLoader)
    await fiber
    const loader = root.loader as unknown as MockLoader
    const slow = loader.mock('slow', () => {})
    const gate = Promise.withResolvers<void>()
    const imported = loader.import.bind(loader)
    loader.import = async (name: string) => {
      if (name === 'slow') await gate.promise
      return imported(name)
    }
    loader.data = [{ id: 'x', name: 'slow' }]
    const reading = loader.root.update(loader.data)
    await sleep(0)
    await fiber.dispose()
    gate.resolve()
    await reading.catch(() => {})
    await sleep(10)
    expect(slow.mock.calls).to.have.length(0)
    expect(errors).to.deep.equal([])
  })
})
