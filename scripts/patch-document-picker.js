#!/usr/bin/env node
/**
 * Fallback: apply react-native-document-picker GuardedResultAsyncTask fix
 * if patch-package did not apply (e.g. different npm version context).
 * Run from repo root after patch-package.
 */
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'node_modules', 'react-native-document-picker');
const javaPath = path.join(
  pkgPath,
  'android',
  'src',
  'main',
  'java',
  'com',
  'reactnativedocumentpicker',
  'RNDocumentPickerModule.java'
);

if (!fs.existsSync(javaPath)) {
  process.exit(0);
}

let content = fs.readFileSync(javaPath, 'utf8');
if (!content.includes('GuardedResultAsyncTask')) {
  process.exit(0);
}

// Apply fix: remove GuardedResultAsyncTask and use ExecutorService + runOnUiQueueThread
content = content.replace('import com.facebook.react.bridge.GuardedResultAsyncTask;\n', '');
content = content.replace(
  'import java.util.UUID;\n',
  'import java.util.UUID;\nimport java.util.concurrent.ExecutorService;\nimport java.util.concurrent.Executors;\n'
);
content = content.replace(
  'new ProcessDataTask(getReactApplicationContext(), uris, copyTo, promise).execute();',
  `final ReactApplicationContext ctx = getReactApplicationContext();
      final Promise taskPromise = promise;
      BACKGROUND_EXECUTOR.execute(() -> {
        try {
          ReadableArray results = new ProcessDataTask(ctx, uris, copyTo).doInBackgroundGuarded();
          ctx.runOnUiQueueThread(() -> taskPromise.resolve(results));
        } catch (Exception e) {
          ctx.runOnUiQueueThread(() -> sendError(E_UNEXPECTED_EXCEPTION, e.getLocalizedMessage(), e));
        }
      });`
);
// ProcessDataTask: remove extends GuardedResultAsyncTask, promise field, super(), @Override doInBackground/onPostExecute
content = content.replace(
  'private static class ProcessDataTask extends GuardedResultAsyncTask<ReadableArray> {',
  'private static final ExecutorService BACKGROUND_EXECUTOR = Executors.newCachedThreadPool();\n\n  private static class ProcessDataTask {'
);
content = content.replace(
  'private final Promise promise;\n\n    protected ProcessDataTask(ReactContext reactContext, List<Uri> uris, String copyTo, Promise promise) {\n      super(reactContext.getExceptionHandler());\n      this.weakContext',
  'protected ProcessDataTask(ReactContext reactContext, List<Uri> uris, String copyTo) {\n      this.weakContext'
);
content = content.replace(
  'this.uris = uris;\n      this.copyTo = copyTo;\n      this.promise = promise;\n    }',
  'this.uris = uris;\n      this.copyTo = copyTo;\n    }'
);
content = content.replace(
  '@Override\n    protected ReadableArray doInBackgroundGuarded() {',
  'protected ReadableArray doInBackgroundGuarded() {'
);
content = content.replace(
  '@Override\n    protected void onPostExecuteGuarded(ReadableArray readableArray) {\n      promise.resolve(readableArray);\n    }\n\n    private WritableMap getMetadata',
  'private WritableMap getMetadata'
);

if (content.includes('GuardedResultAsyncTask')) {
  console.warn('patch-document-picker.js: some replacements did not match; patch-package patch should apply.');
  process.exit(0);
}

fs.writeFileSync(javaPath, content);
console.log('patch-document-picker.js: applied GuardedResultAsyncTask fix.');
process.exit(0);
