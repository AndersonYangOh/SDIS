import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;
import java.rmi.server.UnicastRemoteObject;

public class Server implements ServerRMI{

    private String remoteObjectName;

    private PlateDatabase plates = new PlateDatabase();

    public static void main(String[] args) {
        if (args.length != 1) {
            System.out.println("Usage:");
            System.out.println("\tServer <remote_object_name>");

            System.exit(0);
        }

        String remoteObjectName = args[0];

        Server server = new Server(remoteObjectName);
        server.start();
    }

    public Server(String remoteObjectName) {
        this.remoteObjectName = remoteObjectName;
    }

    public void start() {
        System.out.println("* Starting server with name: " + this.remoteObjectName);
        try {
            ServerRMI rmi = (ServerRMI) UnicastRemoteObject.exportObject(this, 0);
            Registry registry = LocateRegistry.getRegistry();
            registry.rebind(remoteObjectName, rmi);
        } catch (Exception e) {
            System.err.println(e.toString());
            e.printStackTrace();
            System.exit(-1);
        }
    }

    @Override
    public String request(Request request) {
        System.out.println("Received request: " + request.toString());
        String response = "ERROR";
        if (request.type.equals("REGISTER")) {
            response = register(request.plateNumber, request.owner);
        }
        else if (request.type.equals("LOOKUP")) {
            response = lookup(request.plateNumber);
        }

        System.out.println("\t" + request.toString() + " :: " + response);
        return response;
    }

    private String lookup(String plateNumber) {
        String owner = plates.lookup(plateNumber);
        if (!owner.equals("NOT_FOUND"))
            return plateNumber + " " + owner;
        else return "NOT_FOUND";
    }

    private String register(String plateNumber, String owner) {
        int size = plates.register(plateNumber, owner);
        if (size != -1)
            return Integer.toString(size);
        else return "-1";
    }
}
