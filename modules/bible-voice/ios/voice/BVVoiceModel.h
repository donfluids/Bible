#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * The voice's model, run by ONNX Runtime through its C interface (the onnxruntime-c pod).
 * The app needs only this much of it: open the model, and turn one phrase's speech sounds
 * into samples.
 */
@interface BVVoiceModel : NSObject

/** Opens the model at a path inside the app's own storage. */
- (nullable instancetype)initWithModelPath:(NSString *)path threads:(int)threads error:(NSError **)error;

/**
 * The samples of one phrase, 32-bit floats as bytes. `ids` holds 64-bit integers (the
 * model's "input"); `scales` three 32-bit floats (noise, pace, noise width).
 */
- (nullable NSData *)synthesizeWithIds:(NSData *)ids scales:(NSData *)scales error:(NSError **)error;

- (instancetype)init NS_UNAVAILABLE;

@end

NS_ASSUME_NONNULL_END
