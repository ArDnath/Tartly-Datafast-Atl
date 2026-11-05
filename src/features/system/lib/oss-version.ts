import packageJson from '../../../../package.json';

export const OSS_VERSION = packageJson.version;

export function getOssUpdateUrl() {
  return process.env.OSS_UPDATE_URL || '';
}
