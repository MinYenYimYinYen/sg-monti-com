import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/style/components/Card";
import { Container } from "@/style/components/Containers";
import { cn } from "@/style/utils";

interface AuthCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AuthCard({
  title,
  description,
  children,
  footer,
  className,
}: AuthCardProps) {
  return (
    <Container variant="centered">
      <Card className={cn("w-full max-w-md", className)}>
        <CardHeader>
          <CardTitle className="text-center">{title}</CardTitle>
          {description && (
            <CardDescription className="text-center">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer && (
          <CardFooter className="flex-col gap-2 justify-center">
            {footer}
          </CardFooter>
        )}
      </Card>
    </Container>
  );
}
