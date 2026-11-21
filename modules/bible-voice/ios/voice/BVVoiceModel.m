#import "BVVoiceModel.h"

#if __has_include(<onnxruntime/onnxruntime_c_api.h>)
#include <onnxruntime/onnxruntime_c_api.h>
#else
#include "onnxruntime_c_api.h"
#endif

// ONNX Runtime's C interface, the one part of the library this app calls.
static const OrtApi *Ort(void) {
  static const OrtApi *api;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    api = OrtGetApiBase()->GetApi(ORT_API_VERSION);
  });
  return api;
}

static NSError *VoiceError(NSString *message) {
  return [NSError errorWithDomain:@"BibleVoice" code:1 userInfo:@{NSLocalizedDescriptionKey: message}];
}

// YES when the call went well; otherwise the error is passed on and the status freed.
static BOOL Ok(OrtStatus *status, NSError **error) {
  if (status == NULL) {
    return YES;
  }
  if (error) {
    const char *message = Ort()->GetErrorMessage(status);
    *error = VoiceError(message ? [NSString stringWithUTF8String:message] : @"ONNX Runtime error");
  }
  Ort()->ReleaseStatus(status);
  return NO;
}

@implementation BVVoiceModel {
  OrtEnv *_env;
  OrtSession *_session;
  OrtMemoryInfo *_memory;
}

- (nullable instancetype)initWithModelPath:(NSString *)path threads:(int)threads error:(NSError **)error {
  if (!(self = [super init])) {
    return nil;
  }
  const OrtApi *ort = Ort();
  if (ort == NULL) {
    if (error) *error = VoiceError(@"ONNX Runtime is not the version the app was built with");
    return nil;
  }
  if (!Ok(ort->CreateEnv(ORT_LOGGING_LEVEL_WARNING, "BibleVoice", &_env), error)) {
    return nil;
  }
  OrtSessionOptions *options = NULL;
  if (!Ok(ort->CreateSessionOptions(&options), error)) {
    return nil;
  }
  BOOL ok = Ok(ort->SetIntraOpNumThreads(options, threads), error) &&
            Ok(ort->CreateSession(_env, path.fileSystemRepresentation, options, &_session), error) &&
            Ok(ort->CreateCpuMemoryInfo(OrtArenaAllocator, OrtMemTypeDefault, &_memory), error);
  ort->ReleaseSessionOptions(options);
  return ok ? self : nil;
}

- (nullable NSData *)synthesizeWithIds:(NSData *)ids scales:(NSData *)scales error:(NSError **)error {
  const OrtApi *ort = Ort();
  int64_t count = (int64_t)(ids.length / sizeof(int64_t));
  if (count == 0 || scales.length != 3 * sizeof(float)) {
    if (error) *error = VoiceError(@"nothing to say");
    return nil;
  }
  int64_t lengths[1] = {count};
  const int64_t idsShape[2] = {1, count};
  const int64_t lengthsShape[1] = {1};
  const int64_t scalesShape[1] = {3};
  OrtValue *inputs[3] = {NULL, NULL, NULL};
  OrtValue *output = NULL;
  NSData *result = nil;

  if (Ok(ort->CreateTensorWithDataAsOrtValue(_memory, (void *)ids.bytes, ids.length, idsShape, 2, ONNX_TENSOR_ELEMENT_DATA_TYPE_INT64, &inputs[0]), error) &&
      Ok(ort->CreateTensorWithDataAsOrtValue(_memory, lengths, sizeof(lengths), lengthsShape, 1, ONNX_TENSOR_ELEMENT_DATA_TYPE_INT64, &inputs[1]), error) &&
      Ok(ort->CreateTensorWithDataAsOrtValue(_memory, (void *)scales.bytes, scales.length, scalesShape, 1, ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT, &inputs[2]), error)) {
    const char *const inputNames[3] = {"input", "input_lengths", "scales"};
    const char *const outputNames[1] = {"output"};
    if (Ok(ort->Run(_session, NULL, inputNames, (const OrtValue *const *)inputs, 3, outputNames, 1, &output), error)) {
      OrtTensorTypeAndShapeInfo *info = NULL;
      if (Ok(ort->GetTensorTypeAndShape(output, &info), error)) {
        size_t samples = 0;
        ONNXTensorElementDataType type = ONNX_TENSOR_ELEMENT_DATA_TYPE_UNDEFINED;
        BOOL ok = Ok(ort->GetTensorShapeElementCount(info, &samples), error) &&
                  Ok(ort->GetTensorElementType(info, &type), error);
        ort->ReleaseTensorTypeAndShapeInfo(info);
        float *data = NULL;
        if (ok && type != ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT) {
          if (error) *error = VoiceError(@"the model gave something other than samples");
        } else if (ok && Ok(ort->GetTensorMutableData(output, (void **)&data), error)) {
          // A copy of its own: the model's buffer goes with its value.
          result = [NSData dataWithBytes:data length:samples * sizeof(float)];
        }
      }
    }
  }
  for (int i = 0; i < 3; i++) {
    if (inputs[i]) ort->ReleaseValue(inputs[i]);
  }
  if (output) ort->ReleaseValue(output);
  return result;
}

- (void)dealloc {
  const OrtApi *ort = Ort();
  if (ort == NULL) return;
  if (_memory) ort->ReleaseMemoryInfo(_memory);
  if (_session) ort->ReleaseSession(_session);
  if (_env) ort->ReleaseEnv(_env);
}

@end
