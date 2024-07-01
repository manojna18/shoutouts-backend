import express from "express";
import { getClient } from "../db";
import { ObjectId } from "mongodb";
import Shoutout from "../models/ShoutOut";

const shoutoutRouter = express.Router();

const errorResponse = (error: any, res: any) => {
  console.error("FAIL", error);
  res.status(500).json({ message: "Internal Server Error" });
};

// get all Shoutouts
//when filtering in an API, use query string params, when getting one specific piece of data use path paramaters
shoutoutRouter.get("/shoutouts", async (req, res) => {
  const toQueryStringParams: string | undefined = req.query[
    "to-name"
  ] as string;
  const me: string | undefined = req.query.me as string;

  const mongoQuery: any = {};
  if (toQueryStringParams) {
    mongoQuery.to = toQueryStringParams;
  } else if (me) {
    mongoQuery.$or = [{ to: me }, { from: me }];
  }

  try {
    const client = await getClient();
    const cursor = client
      .db()
      .collection<Shoutout>("shoutouts")
      .find(mongoQuery);
    const results = await cursor.toArray();
    res.status(200).json(results);
  } catch (err) {
    errorResponse(err, res);
  }
});

// get Shoutout by ID
shoutoutRouter.get("/shoutouts/:id", async (req, res) => {
  try {
    const _id: ObjectId = new ObjectId(req.params.id);
    const client = await getClient();
    const shoutout = await client
      .db()
      .collection<Shoutout>("shoutouts")
      .findOne({ _id });
    if (shoutout) {
      res.status(200).json(shoutout);
    } else {
      res.status(404).json({ message: "Not Found" });
    }
  } catch (err) {
    errorResponse(err, res);
  }
});

//get Shoutouts by name
// shoutoutRouter.get("/shoutouts/:name", async (req, res) => {
//   try {
//     const name: string = req.params.name;
//     const client = await getClient();
//     const shoutouts = await client
//       .db()
//       .collection<Shoutout>("shoutouts")
//       .find({ to: name })
//       .toArray();
//     console.log("shoutouts fetched:", shoutouts);
//     if (shoutouts.length > 0) {
//       res.status(200).json(shoutouts);
//     } else {
//       res.status(404).json({ message: "Not found" });
//     }
//   } catch (err) {
//     errorResponse(err, res);
//   }
// });

shoutoutRouter.get("/top-five", (req, res) => {
  getClient()
    .then((client) => {
      return client
        .db()
        .collection<Shoutout>("shoutouts")
        .aggregate([
          {
            $group: {
              _id: "$to",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 5 },
          { $project: { count: 1 } },
        ])
        .toArray()
        .then((results) => {
          res.set("Cache-Control", "public, max-age=60, s-maxage=120");
          res.json(results);
        });
    })
    .catch((err) => {
      console.error("FAIL", err);
      res.status(500).json({ message: "Internal Server Error" });
    });
});

// create new Shoutout
shoutoutRouter.post("/shoutouts", async (req, res) => {
  try {
    const shoutout: Shoutout = req.body;
    const client = await getClient();
    await client.db().collection<Shoutout>("shoutouts").insertOne(shoutout);
    res.status(201).json(shoutout);
  } catch (err) {
    errorResponse(err, res);
  }
});

// delete Shoutout by ID
shoutoutRouter.delete("/shoutouts/:id", async (req, res) => {
  try {
    const _id: ObjectId = new ObjectId(req.params.id);
    const client = await getClient();
    const result = await client
      .db()
      .collection<Shoutout>("shoutouts")
      .deleteOne({ _id });
    if (result.deletedCount) {
      res.sendStatus(204);
    } else {
      res.status(404).json({ message: "Not Found" });
    }
  } catch (err) {
    errorResponse(err, res);
  }
});

// replace / update Shoutout by ID
shoutoutRouter.put("/shoutouts/:id", async (req, res) => {
  try {
    const _id: ObjectId = new ObjectId(req.params.id);
    const updatedShoutout: Shoutout = req.body;
    delete updatedShoutout._id; // remove _id from body so we only have one.
    const client = await getClient();
    const result = await client
      .db()
      .collection<Shoutout>("shoutouts")
      .replaceOne({ _id }, updatedShoutout);
    if (result.modifiedCount) {
      updatedShoutout._id = _id;
      res.status(200).json(updatedShoutout);
    } else {
      res.status(404).json({ message: "Not Found" });
    }
  } catch (err) {
    errorResponse(err, res);
  }
});

export default shoutoutRouter;
