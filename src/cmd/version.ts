import { writeFile } from 'jsonfile'
import { versionBumpInfo } from '@abmao/bump'
import colors from 'colors'
import { gitSyncSave, gitDiffSave } from '../git'
import type {
  Context,
  AnalysisBlockObject,
  SetAnalysisBlockObject,
} from '../index'
import { warn, writeFiles } from '../utils'
import type { WriteObject } from '../utils'
import { dependentSearch } from '../utils/packageJson'
import { WARN_NOW_VERSION } from '../constant'

export function cmdVersion (context: Context) {
  const mode = context.getCorrectOptionValue<'mode'>('version', 'mode')

  if (mode === 'sync') {
    return handleSyncVersion(context)
  }
  else if (mode === 'diff') {
    return handleDiffVersion(context)
  }
}
export async function handleSyncVersion (context: Context) {
  const oldVersion = context.rootPackageJson.version
  const version = await changeVersion()

  if (oldVersion === version) {
    warn(WARN_NOW_VERSION)
    process.exit()
  }
  context.rootPackageJson.version = version

  const changes: WriteObject[] = [
    {
      filePath: context.rootFilePath,
      packageJson: context.rootPackageJson,
    },
  ]

  for (let index = 0; index < context.packagesJSON.length; index++) {
    const packageJson = context.packagesJSON[index]
    const analysisBlock = context.packageJsonToAnalysisBlock(packageJson)
    packageJson.version = version

    if (analysisBlock) {
      changes.push({
        filePath: context.filesPath[index],
        packageJson,
      })
      await changeRelyMyVersion(
        context,
        analysisBlock,
      )
    }
  }
  await writeFiles(changes)
  await gitSyncSave(
    version as string,
    context.options.version.message,
  )
}
export async function handleDiffVersion (context: Context) {
  const triggerSign: SetAnalysisBlockObject = new Set()

  await context.forDiffPack(async function (analysisBlock, dir) {
    await changeVersionResultItem(context, analysisBlock, dir, triggerSign)
  }, 'v')
  await writeJSONs(triggerSign)
  await gitDiffSave(
    [...triggerSign].map(({ packageJson }) => {
      return `${packageJson.name as string}@${packageJson.version}`
    }),
    context.options.version.message,
  )
}
export async function changeVersionResultItem (
  context: Context,
  analysisBlock: AnalysisBlockObject,
  dir: string,
  triggerSign: SetAnalysisBlockObject,
) {
  const { packageJson } = analysisBlock

  if (triggerSign.has(analysisBlock)) return
  triggerSign.add(analysisBlock)

  const oldVersion = packageJson.version
  console.log(colors.white.bold(`package: ${packageJson.name}`))
  const version = await changeVersion(dir)

  if (version !== oldVersion) {
    packageJson.version = version
    await changeRelyMyVersion(context, analysisBlock, triggerSign)
  }
}
export async function changeRelyMyVersion (
  context: Context,
  analysisBlock: AnalysisBlockObject,
  triggerSign?: SetAnalysisBlockObject,
) {
  const relyMyDir = analysisBlock.relyMyDir

  for (let i = 0; i < relyMyDir.length; i++) {
    const relyDir = relyMyDir[i]
    const analysisBlockRelyMy = context.contextAnalysisDiagram[relyDir]
    const isChange = dependentSearch(analysisBlock, analysisBlockRelyMy)

    // 只有有变更，并且带triggerSign，才会走version变动
    if (isChange && triggerSign && !triggerSign.has(analysisBlockRelyMy)) {
      await changeVersionResultItem(
        context,
        analysisBlockRelyMy,
        relyDir,
        triggerSign,
      )
    }
  }
}
export function writeJSONs (
  triggerSign: SetAnalysisBlockObject,
) {
  return Promise.all([...triggerSign].map(({ filePath, packageJson }) => {
    return writeFile(filePath, packageJson, { spaces: 2 })
  }))
}

export async function changeVersion (cwd?: string) {
  const versionBumpResults = await versionBumpInfo({
    cwd,
  })

  return versionBumpResults.newVersion
}
