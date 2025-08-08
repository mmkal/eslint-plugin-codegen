import {test, expect} from 'vitest'
import * as dep from '../src/dependencies'

test('imports isomorphic-git', () => {
  expect(dep.isomorphicGitSync).toBeDefined()
  expect(dep.isomorphicGitSync.checkout({}))
})
