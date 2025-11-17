import express from "express";
import twilio from "twilio";

const { jwt } = twilio;
const { AccessToken } = jwt;
const { VideoGrant } = AccessToken;

const router = express.Router();



const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const API_KEY_SID = process.env.TWILIO_API_KEY_SID;
const API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET;
console.log("TOKEN CHECK");
console.log("ACCOUNT:", ACCOUNT_SID);
console.log("KEY SID:", API_KEY_SID);
console.log("KEY SECRET LENGTH:", API_KEY_SECRET?.length);

router.get("/token", (req, res) => {
  const identity = req.query.identity;
  const roomName = req.query.room;

  if (!identity || !roomName) {
    return res.status(400).json({ error: "Missing identity or room" });
  }

  const videoGrant = new VideoGrant({ room: roomName });

  const token = new AccessToken(
    ACCOUNT_SID,
    API_KEY_SID,
    API_KEY_SECRET,
    {
      identity: identity,
      ttl: 3600
    }
  );

  token.addGrant(videoGrant);

  res.json({ token: token.toJwt() });
});

export default router;
