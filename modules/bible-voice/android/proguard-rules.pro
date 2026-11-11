# ONNX Runtime's native code finds these classes and their members by name; a release
# build that renames or drops them stops the app when the voice is first used.
-keep class ai.onnxruntime.** { *; }
-keepclassmembers class ai.onnxruntime.** { *; }
-keep class org.riversresearch.biblevoice.** { *; }
