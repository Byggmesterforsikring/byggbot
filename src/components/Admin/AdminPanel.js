import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import UserManagementV2 from './UserManagementV2';
import SystemPromptEditor from './SystemPromptEditor';
import ProduktKonfigurasjonAdmin from './ProduktKonfigurasjonAdmin';

function AdminPanel() {
    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Administrasjon</h1>

            {/* Tab-basert administrasjon */}
            {true && ( // Tilgangssjekk kan legges til her
                <Tabs defaultValue="users">
                    <TabsList className="mb-4">
                        <TabsTrigger value="users">Brukere</TabsTrigger>
                        <TabsTrigger value="system">System</TabsTrigger>
                        <TabsTrigger value="prompts">AI Prompter</TabsTrigger>
                        <TabsTrigger value="produktkonfigurasjon">Produktkonfigurasjon</TabsTrigger>
                    </TabsList>

                    <TabsContent value="users">
                        <UserManagementV2 />
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

                    <TabsContent value="produktkonfigurasjon">
                        <ProduktKonfigurasjonAdmin />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}

export default AdminPanel; 