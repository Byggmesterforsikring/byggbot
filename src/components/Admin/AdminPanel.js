import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card.jsx";
import UserManager from "./UserManager";
import SystemPromptEditor from "./SystemPromptEditor";
import { useAuth } from "../Auth/AuthContext.jsx";

function AdminPanel() {
    const { user } = useAuth();

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>

            {!user || !user.isAdmin ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Ingen tilgang</CardTitle>
                        <CardDescription>Du har ikke tillatelse til å vise admin-panelet.</CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <Tabs defaultValue="users">
                    <TabsList className="mb-4">
                        <TabsTrigger value="users">Brukere</TabsTrigger>
                        <TabsTrigger value="system">System</TabsTrigger>
                        <TabsTrigger value="prompts">AI Prompter</TabsTrigger>
                    </TabsList>

                    <TabsContent value="users">
                        <UserManager />
                    </TabsContent>

                    <TabsContent value="system">
                        <Card>
                            <CardHeader>
                                <CardTitle>System Innstillinger</CardTitle>
                                <CardDescription>Administrer systeminnstillinger</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p>Systeminnstillinger kommer snart...</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="prompts">
                        <SystemPromptEditor />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}

export default AdminPanel; 