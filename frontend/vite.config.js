import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Simple plugin to copy _redirects file
const copyRedirectsPlugin = () => {
  return {
    name: 'copy-redirects',
    writeBundle(options) {
      const source = path.resolve(__dirname, '_redirects')
      const destination = path.resolve(options.dir, '_redirects')
      
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, destination)
        console.log('✓ Copied _redirects to dist folder')
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), copyRedirectsPlugin()]
})