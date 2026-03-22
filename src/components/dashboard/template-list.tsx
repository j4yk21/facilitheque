"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Template {
  id: string;
  boss_name: string;
  boss_avatar_id: string;
  questions: unknown[];
  created_at: string;
}

interface TemplateListProps {
  templates: Template[];
}

export function TemplateList({ templates }: TemplateListProps) {
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-gray-300 py-16">
        <p className="text-gray-500">No templates yet. Create your first boss!</p>
        <Link href="/teacher/templates/new">
          <Button>Create Template</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Link key={template.id} href={`/teacher/templates/${template.id}`}>
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>{template.boss_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{(template.questions as unknown[]).length} questions</span>
                <span>
                  {new Date(template.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
