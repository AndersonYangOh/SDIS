import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.util.HashMap;

public class Server {
    private static int port;
    private static DatagramSocket socket;
    private static HashMap<String, String> licencePlates = new HashMap<>();
    public static void main(String[] args) {
        if (args.length != 1) {
            System.out.println("Usage:");
            System.out.println("\tServer <port>");

            return;
        }
        port = Integer.parseInt(args[0]);

        System.out.println("Opening socket on port: " + port);
        try {
            socket = new DatagramSocket(port);
            run();

            System.out.println("Closing socket...");
            socket.close();
        }
        catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static int run() {
        boolean done = false;
        while (!done) {
            byte[] buffer = new byte[256];
            DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
            try {
                socket.receive(packet);
            }
            catch (Exception e) {
                e.printStackTrace();
            }
            String request_str = new String(packet.getData(), 0, packet.getLength());
            System.out.println("Received request: '" + request_str + "'");

            String response = "";
            try {
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

                System.out.println("Sending response: '" + response + "'");
                buffer = response.getBytes();
                InetAddress addr = packet.getAddress();
                int port = packet.getPort();
                packet = new DatagramPacket(buffer, buffer.length, addr, port);
                try {
                    socket.send(packet);
                }
                catch (Exception e) {
                    e.printStackTrace();
                }
            }
            catch (IllegalArgumentException e) {
                e.printStackTrace();
            }
        }
        return 1;
    }
}
