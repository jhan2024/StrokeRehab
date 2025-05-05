class Hole
{
	constructor(x, y, r)
	{
		this.x = x;
		this.y = y;
		this.r = r;
	}

	draw(ctx)
	{
		ctx.fillStyle = "rgb(0,0,0)"
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.r - ctx.lineWidth / 2.0, 0, 2*Math.PI);
		ctx.fill();
	}
}