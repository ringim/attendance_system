import ZKLib from "node-zklib";

const zkInstance = new ZKLib("192.168.1.5", 4370, 10000, 4000);

try {
  await zkInstance.createSocket();
  console.log("Connected to device");

  const logs = await zkInstance.getAttendances();
  console.log("Total logs:", logs?.data?.length || 0);
  console.log("\nLast 5 attendance logs:");
  console.log(JSON.stringify(logs?.data?.slice(-5), null, 2));

  await zkInstance.disconnect();
  console.log("\nDisconnected");
  process.exit(0);
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
