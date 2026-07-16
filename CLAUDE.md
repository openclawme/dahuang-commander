# Dahuang Commander Development Rules

## WeChat Mini Program Deployment Rule (CRITICAL)
- **Automatic Upload Requirement**: Whenever any changes or modifications are made to any WeChat Mini Program files (located under `/home/admin/Gemini/dahuang-commander/dahuang-commander-mp/`), you MUST automatically execute the upload script to compile and upload the new code to WeChat servers.
- **Upload Command**:
  ```bash
  cd /home/admin/Gemini/dahuang-commander/dahuang-commander-mp && npm run upload
  ```
- Always verify that the compilation and upload completed successfully (using `miniprogram-ci`) and present the updated version details clearly to the user.
