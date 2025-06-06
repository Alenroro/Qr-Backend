const express = require("express");
const multer = require("multer");
const mongodb = require("mongodb");
const db = require("../modals/mongodb");
const { ObjectId } = require("mongodb");

const storage = multer.memoryStorage();
const upload = multer({ storage });
const comboRouter = express.Router();
let bucket;

const initBucket = async () => {
  if (!bucket) {
    try {
      const database = await db.getDatabase();
      bucket = new mongodb.GridFSBucket(database);
    } catch (error) {
      throw new Error("Failed to connect to GridFS");
    }
  }
};

comboRouter.use(async (req, res, next) => {
  try {
    await initBucket();
    next();
  } catch (error) {
    console.error("Failed to connect to GridFS:", error);
    res
      .status(500)
      .json({ message: "Failed to connect to GridFS.", error: error.message });
  }
});

comboRouter.get("/combo", async (req, res) => {
  try {
    const database = await db.getDatabase();
    const metadataCollection = database.collection("combos");
    const combos = await metadataCollection.find({}).toArray();
    res.status(200).json(combos);
  } catch (error) {
    console.error("Error fetching combos:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

comboRouter.post("/add", upload.single("comboImage"), async (req, res) => {
  try {
    const { comboName, comboPrice, comboType } = req.body;
    const comboItems = JSON.parse(req.body.comboItems);
    const comboImage = req.file;

    if (!comboName || !comboItems || !comboImage || !comboPrice || !comboType) {
      return res
        .status(400)
        .json({ message: "Name, items, image, type, and price are required" });
    }

    // Upload file to GridFS
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
    });

    uploadStream.end(req.file.buffer);

    uploadStream.on("finish", async () => {
      try {
        const database = await db.getDatabase();
        const metadataCollection = database.collection("combos");

        const comboData = {
          comboName,
          comboPrice,
          comboItems,
          comboType,
          comboCategoryName: "combo",
          comboImage: uploadStream.id.toString(), // This is the actual file ID from GridFS
          filename: req.file.originalname,
          contentType: req.file.mimetype,
          uploadDate: new Date(),
          availability: req.body.availability || "available",
        };

        await metadataCollection.insertOne(comboData);

        res.status(200).json({
          message: "Combo added successfully",
          fileId: uploadStream.id.toString(),
        });
      } catch (error) {
        console.error("Error inserting combo metadata:", error);
        res
          .status(500)
          .json({
            message: "Error storing combo metadata.",
            error: error.message,
          });
      }
    });

    uploadStream.on("error", (error) => {
      console.error("Error uploading file:", error);
      res
        .status(500)
        .json({ message: "Error uploading file.", error: error.message });
    });
  } catch (error) {
    console.error("Error handling request:", error);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
});

comboRouter.patch("/stocks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { availability } = req.body;
    let database = await db.getDatabase();
    let collection = database.collection("combos");

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { availability } }
    );

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: "Updated successfully" });
    } else {
      res.status(404).json({ message: "Combo not found or no changes" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

comboRouter.get("/image/:fileId", async (req, res) => {
  const { fileId } = req.params;
  try {
    const objectId = new mongodb.ObjectId(fileId);
    const downloadStream = bucket.openDownloadStream(objectId);

    downloadStream.on("error", (error) => {
      console.error("Error retrieving file:", error);
      res
        .status(500)
        .json({ message: "Error retrieving file", error: error.message });
    });

    const file = await bucket.find({ _id: objectId }).toArray();
    if (file.length === 0) {
      return res.status(404).json({ message: "File not found" });
    }

    res.setHeader(
      "Content-Type",
      file[0].contentType || "application/octet-stream"
    );
    downloadStream.pipe(res);
  } catch (error) {
    console.error("Error processing request:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

comboRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const database = await db.getDatabase();
    const metadataCollection = database.collection("combos");

    const combo = await metadataCollection.findOne({ _id: new ObjectId(id) });

    if (!combo) {
      return res.status(404).json({ message: "Combo not found" });
    }

    await metadataCollection.deleteOne({ _id: new ObjectId(id) });
    await bucket.delete(new ObjectId(combo.comboImage));

    res.status(200).json({ message: "Combo deleted successfully" });
  } catch (error) {
    console.error("Error deleting combo:", error);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
});

module.exports = comboRouter;
 