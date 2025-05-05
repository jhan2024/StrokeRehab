class Animation
{
	constructor(type, color, x, y, text = "")
	{
		this.type = type;
		this.color = color;
		this.x = x;
		this.y = y;
		this.frame = 0;
		this.text = text;
	}

	draw(ctx)
	{
		if (this.type == "explosion")
		{
			ctx.strokeStyle = "rgba" + this.color.substring(3,this.color.length - 1) +
				"," + ((61 - this.frame) / 60.0) + ")";
			ctx.lineWidth = 10 - (this.frame * 0.1);
			ctx.beginPath();
			ctx.arc(this.x, this.y, 15 + this.frame, 0, 2*Math.PI);
			ctx.stroke();
		}

		else if (this.type == "score")
		{
			ctx.fillStyle = "rgba" + this.color.substring(3,this.color.length - 1) +
				"," + ((61 - this.frame) / 60.0) + ")";
			ctx.font = "25px Arial";
			ctx.textAlign = "center";
			ctx.beginPath();
			ctx.fillText(this.text, this.x, this.y - this.frame);
			ctx.fill();
		}

		this.frame++;
	}
}