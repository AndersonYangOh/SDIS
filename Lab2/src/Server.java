import javax.xml.crypto.Data;
import java.io.IOException;
import java.net.*;
import java.util.HashMap;

public class Server {

    private static int srvcPort;
    private static int mcastPort;
    private static String srvcAddr;
    private static String mcastAddr;
    private static InetAddress mcastInetAddr;

    private static DatagramSocket srvSocket;
    private static MulticastSocket mcastSocket;

    private static HashMap<String, String> licencePlates = new HashMap<>();

    public static void main(String[] args) {
        if (args.length != 3) {
            System.out.println("Usage:");
            System.out.println("\tServer <srvc_port> <mcast_addr> <mcast_port>");

            return;
        }

        try {
            srvcAddr = Utils.getIPv4();
        } catch (SocketException e) {
            e.printStackTrace();
        }
        srvcPort = Integer.parseInt(args[0]);
        mcastAddr = args[1];
        mcastPort = Integer.parseInt(args[2]);

        try{
            System.out.println("Opening multicast socket...");
            mcastSocket = new MulticastSocket();
            mcastSocket.setTimeToLive(1);
            mcastInetAddr = InetAddress.getByName(mcastAddr);
            System.out.println("Opening server socket...");
            srvSocket = new DatagramSocket(srvcPort);
            srvSocket.setSoTimeout(1000);
        }
        catch (IOException e) {
            e.printStackTrace();
            return;
        }

        run();

        srvSocket.close();
        mcastSocket.close();
    }

    private static int run() {
        boolean done = false;
        long elapsedTime = 1000;
        long prevTime = System.currentTimeMillis();

        while (!done) {
            byte[] buffer = new byte[512];
            DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
            try {
                srvSocket.receive(packet);
                String request_str = new String(packet.getData(), 0, packet.getLength());
                String response = "";
                Request request = new Request(request_str);
                if (request.type.equals("REGISTER")) {
                    if (licencePlates.containsKey(request.plateNumber)) {
                        response = "-1";
                    }
                    else {
                        licencePlates.put(request.plateNumber, request.owner);
                        response = Integer.toString(licencePlates.size());
                    }
                }
                else if (request.type.equals("LOOKUP")) {
                    if (licencePlates.containsKey(request.plateNumber)) {
                        response = request.plateNumber + " " + licencePlates.get(request.plateNumber);
                    }
                }

                System.out.println(request.toString() + " :: " + response);
                buffer = response.getBytes();
                InetAddress addr = packet.getAddress();
                int port = packet.getPort();
                packet = new DatagramPacket(buffer, buffer.length, addr, port);
                try {
                    srvSocket.send(packet);
                }
                catch (Exception e) {
                    e.printStackTrace();
                }
            }
            catch (IllegalArgumentException e) {
                e.printStackTrace();
            }
            catch (SocketTimeoutException e) {
            }
            catch (IOException e ) {
                e.printStackTrace();
            }

            long currTime = System.currentTimeMillis();
            long deltaTime = currTime - prevTime;
            elapsedTime += deltaTime;
            prevTime = currTime;

            if (elapsedTime >= 1000) {
                elapsedTime -= 1000;

                String mcastAd = srvcAddr + ":" + Integer.toString(srvcPort);
                packet = new DatagramPacket(mcastAd.getBytes(), mcastAd.getBytes().length,
                        mcastInetAddr, mcastPort);
                try {
                    mcastSocket.send(packet);
                }
                catch (IOException e) {
                    e.printStackTrace();
                }
                System.out.println(
                        "multicast: "+mcastAddr+" "+mcastPort+": "+srvcAddr+" "+srvcPort
                );
            }
        }
        return 1;
    }
}
