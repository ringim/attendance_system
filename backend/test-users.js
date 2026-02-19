import ZKLib from "node-zklib";

const zkInstance = new ZKLib("192.168.1.5", 4370, 10000, 4000);

try {
  await zkInstance.createSocket();
  console.log("Connected to device");

  const users = await zkInstance.getUsers();
  console.log("Total users:", users?.data?.length || 0);
  console.log(
    "Sample users:",
    JSON.stringify(users?.data?.slice(0, 3), null, 2),
  );

  await zkInstance.disconnect();
  console.log("Disconnected");
  process.exit(0);
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
