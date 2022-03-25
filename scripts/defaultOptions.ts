export interface ExecuteCommandOptions {
  packagesPath: string
  rootPackageIgnore: boolean
  mode: 'sync' | 'diff'
  version: {
    commitMessage: string
  }
  publish: {
    commitMessage: string
  }
}
export const defaultOptions: ExecuteCommandOptions = {
  packagesPath: 'packages/*',
  rootPackageIgnore: false,
  mode: 'sync',
  version: {
    commitMessage: 'chore: version',
  },
  publish: {
    commitMessage: 'chore: publish',
  },
}