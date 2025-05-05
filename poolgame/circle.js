class Circle
{
	constructor(x, y, velX, velY, r, m, isDynamic, color, label, isStriped)
	{
		this.x = x;
		this.y = y;
		this.velX = velX;
		this.velY = velY;
		this.r = r;
		this.m = m;
		this.isDynamic = isDynamic;
		this.color = color;
		this.label = label;
		this.isStriped = isStriped;
	}

	draw(ctx)
	{
		if (this.isStriped)
		{
			ctx.fillStyle = "rgb(255,255,255)";
			ctx.beginPath();
			ctx.arc(this.x, this.y, this.r - ctx.lineWidth / 2.0,0,2*Math.PI);
			ctx.fill();

			ctx.strokeStyle = this.color;
			ctx.lineWidth = this.r * 0.4;
			ctx.beginPath();
			ctx.arc(this.x, this.y, this.r - ctx.lineWidth / 2.0,0,2*Math.PI);
			ctx.stroke();
		}

		if (!this.isStriped)
		{
			ctx.fillStyle = this.color;
			ctx.beginPath();
			ctx.arc(this.x, this.y, this.r - ctx.lineWidth / 2.0,0,2*Math.PI);
			ctx.fill();
		}

		ctx.strokeStyle = "rgb(0,0,0)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.r - ctx.lineWidth / 2.0,0,2*Math.PI);
		ctx.stroke();

		

		ctx.textAlign = "center";
		if (this.label == "2" || this.label == "4" || this.label == "7" || this.label == "8")
		{
			ctx.fillStyle = "rgb(255,255,255)";
		}
		else
		{
			ctx.fillStyle = "rgb(0,0,0)";
		}
		ctx.font = "" + (this.r * 2 / 3) + "px Arial";
		ctx.fillText(this.label, this.x, this.y + this.r / 3.75);
	}
}