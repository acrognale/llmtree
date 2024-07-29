import { notarize } from '@electron/notarize'
import { Platform } from 'electron-builder'

export default async function afterSign(context) {
  if (context.packager.platform !== Platform.MAC) {
    return
  }
  try {
    console.log(`Notarizing ${context.packager.appInfo.productFilename}...`)
    console.log(
      `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`,
    )
    await notarize({
      tool: 'notarytool',
      appPath: `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`,
      keychainProfile: 'acrognale',
    })
  } catch (error) {
    console.error(error)
  }
}
