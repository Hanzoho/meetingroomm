"use client";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

const MeetingroomCard = ({ meetingroom }) => {
  return (
    <Link href={`/bookingroom/${meetingroom.id}`}>
      <Card className="group h-full overflow-hidden transition-transform hover:scale-[1.02] cursor-pointer">
        <div className="relative aspect-video">
          <Image
            src={meetingroom.image_url}
            alt={meetingroom.name}
            layout="fill"
            className="object-cover transition-transform group-hover:scale-105"
          />

          {/* แสดงสถานะห้อง */}
          <Badge 
            className={`absolute right-2 top-2 ${
              meetingroom.available ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {meetingroom.available ? "ว่าง" : "เต็ม"}
          </Badge>
        </div>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold">{meetingroom.name}</h3>

          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
            {meetingroom.description}
          </p>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-primary font-bold">฿{meetingroom.price.toLocaleString()}</span>
            <span className="text-sm text-gray-500">/{meetingroom.duration} ชม.</span>
          </div>

          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <span>ผู้เข้าร่วม: {meetingroom.capacity} คน</span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {meetingroom.facilities.map((facility, index) => (
              <Badge key={index} variant="outline">
                {facility}
              </Badge>
            ))}
          </div>

          {!meetingroom.available && (
            <p className="mt-2 text-sm text-red-500">ห้องถูกจองเต็มแล้ว</p>
          )}
          
          <Button className="mt-4 w-full" disabled={!meetingroom.available}>
            {meetingroom.available ? "จองห้องนี้" : "ไม่สามารถจองได้"}
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
};