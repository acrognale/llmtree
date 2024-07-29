/* Based on https://kilianvalkhof.com/2019/electron/notarizing-your-electron-application/ */

import { notarize } from '@electron/notarize'
import dotenv from 'dotenv'

dotenv.config()

export default async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== 'darwin') {
    return
  }

  const appName = context.packager.appInfo.productFilename

  return await notarize({
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID!,
    appleIdPassword: process.env.APPLE_ID_PASSWORD!,
    teamId: process.env.APPLE_TEAM_ID!,
  })
}
