import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const TranslationSchema = new Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
  },
  { _id: false }
);

const PostSchema = new Schema(
  {
    translations: {
      type: Map,
      of: TranslationSchema,
      required: true,
    },
    originalLocale: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "posts" }
);

export const Post = models.Post || model("Post", PostSchema);
